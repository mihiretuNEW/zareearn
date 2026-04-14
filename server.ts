import express from "express";
import { Telegraf, Markup, Context } from "telegraf";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Firebase Admin Setup ---
import fs from "fs";
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();

// --- Bot Configuration ---
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8699865323:AAG3tLuijc0uB00Gn3Ty7yfQJQR7UpJ2w9M";
const ADMIN_ID = process.env.ADMIN_ID || "1644886826";
const CHANNEL_USERNAME = process.env.CHANNEL_USERNAME || "@zareearn";
const APP_URL = process.env.APP_URL;

const bot = new Telegraf(BOT_TOKEN);

// --- Constants ---
const MIN_WITHDRAWAL_USD = 2;
const POINTS_PER_DOLLAR = 1000; // 100 pts = $0.1 => 1000 pts = $1
const MIN_WITHDRAWAL_POINTS = MIN_WITHDRAWAL_USD * POINTS_PER_DOLLAR;
const REFERRAL_REWARD_POINTS = 50; // $0.05 equivalent

// --- Helper Functions ---
async function isUserInChannel(userId: number) {
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_USERNAME}&user_id=${userId}`
    );
    const status = response.data.result.status;
    return ["member", "administrator", "creator"].includes(status);
  } catch (error) {
    console.error("Error checking channel membership:", error);
    return false;
  }
}

async function getSettings() {
  const doc = await db.collection("settings").doc("global").get();
  return doc.data() || { startEarningLink: "", supportLink: "" };
}

// --- Bot Logic ---

// Start Command
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const username = ctx.from.username || ctx.from.first_name;
  const startPayload = ctx.payload; // Referral ID

  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    await userRef.set({
      uid: userId,
      username: username,
      balance: 0,
      referralsCount: 0,
      referredBy: startPayload || null,
      joinedChannel: false,
      createdAt: new Date().toISOString(),
    });
  }

  const welcomeMsg = `Welcome to *ZareEarn Bot*! 🚀\n\nEarn rewards by completing tasks and referring friends.\n\nTo continue, please join our official channel:`;
  
  ctx.replyWithMarkdown(
    welcomeMsg,
    Markup.inlineKeyboard([
      [Markup.button.url("📢 Join Channel", `https://t.me/${CHANNEL_USERNAME.replace("@", "")}`)],
      [Markup.button.callback("✅ I have joined", "check_joined")]
    ])
  );
});

// Check Joined Callback
bot.action("check_joined", async (ctx) => {
  const userId = ctx.from.id;
  const joined = await isUserInChannel(userId);

  if (joined) {
    const userRef = db.collection("users").doc(userId.toString());
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    // If first time joining, reward the referrer
    if (userData && !userData.joinedChannel) {
      await userRef.update({ joinedChannel: true });
      
      if (userData.referredBy) {
        const referrerRef = db.collection("users").doc(userData.referredBy);
        const referrerDoc = await referrerRef.get();
        if (referrerDoc.exists) {
          await referrerRef.update({
            balance: admin.firestore.FieldValue.increment(REFERRAL_REWARD_POINTS),
            referralsCount: admin.firestore.FieldValue.increment(1)
          });
          // Notify referrer
          try {
            await bot.telegram.sendMessage(userData.referredBy, `🎉 New referral! You earned ${REFERRAL_REWARD_POINTS} points.`);
          } catch (e) {}
        }
      }
    }

    return showDashboard(ctx);
  } else {
    ctx.answerCbQuery("❌ You haven't joined the channel yet!", { show_alert: true });
  }
});

// Dashboard
async function showDashboard(ctx: Context) {
  const userId = ctx.from?.id.toString();
  if (!userId) return;

  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.data();

  const dashboardMsg = `*ZareEarn Dashboard* 📊\n\n👤 User: ${userData?.username}\n💰 Balance: ${userData?.balance} pts ($${(userData?.balance / POINTS_PER_DOLLAR).toFixed(2)})\n👥 Referrals: ${userData?.referralsCount}`;

  const buttons = [
    [Markup.button.callback("🚀 Start Earning", "start_earning")],
    [Markup.button.callback("💰 Balance", "show_balance"), Markup.button.callback("💸 Withdraw", "withdraw_request")],
    [Markup.button.callback("👥 Refer Friends", "refer_friends"), Markup.button.callback("🎧 Support", "show_support")]
  ];

  if (userId === ADMIN_ID) {
    buttons.push([Markup.button.callback("🛠 Admin Panel", "admin_panel")]);
  }

  if (ctx.callbackQuery) {
    ctx.editMessageText(dashboardMsg, { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons) });
  } else {
    ctx.replyWithMarkdown(dashboardMsg, Markup.inlineKeyboard(buttons));
  }
}

// Button Actions
bot.action("show_balance", async (ctx) => {
  const userId = ctx.from.id.toString();
  const userDoc = await db.collection("users").doc(userId).get();
  const balance = userDoc.data()?.balance || 0;
  const usd = (balance / POINTS_PER_DOLLAR).toFixed(2);

  ctx.answerCbQuery(`Current Balance: ${balance} pts ($${usd})\nNote: 100 pts = $0.1`, { show_alert: true });
});

bot.action("start_earning", async (ctx) => {
  const settings = await getSettings();
  if (settings.startEarningLink) {
    ctx.replyWithMarkdown(
      "Click the button below to start earning:",
      Markup.inlineKeyboard([[Markup.button.url("🔗 Open Task", settings.startEarningLink)]])
    );
  } else {
    ctx.answerCbQuery("No tasks available at the moment. Check back later!", { show_alert: true });
  }
});

bot.action("show_support", async (ctx) => {
  const settings = await getSettings();
  if (settings.supportLink) {
    ctx.replyWithMarkdown(
      "Need help? Contact our support team:",
      Markup.inlineKeyboard([[Markup.button.url("🎧 Contact Support", settings.supportLink)]])
    );
  } else {
    ctx.answerCbQuery("Support link not configured.", { show_alert: true });
  }
});

bot.action("refer_friends", async (ctx) => {
  const userId = ctx.from.id.toString();
  const refLink = `https://t.me/zareearn_bot?start=${userId}`;
  const msg = `*Refer & Earn* 👥\n\nShare your unique link and earn ${REFERRAL_REWARD_POINTS} pts ($0.05) for every friend who joins the channel!\n\nYour Link:\n\`${refLink}\``;
  
  ctx.replyWithMarkdown(msg);
});

bot.action("withdraw_request", async (ctx) => {
  const userId = ctx.from.id.toString();
  const userDoc = await db.collection("users").doc(userId).get();
  const balance = userDoc.data()?.balance || 0;

  if (balance < MIN_WITHDRAWAL_POINTS) {
    ctx.answerCbQuery(`❌ Minimum withdrawal is $${MIN_WITHDRAWAL_USD} (${MIN_WITHDRAWAL_POINTS} pts). You have ${balance} pts.`, { show_alert: true });
    return;
  }

  ctx.reply("Please enter your Telebirr phone number to proceed with the withdrawal:");
  // Set state to wait for phone number
  await db.collection("users").doc(userId).update({ awaitingWithdrawal: true });
});

// Handle text messages (for withdrawal and admin commands)
bot.on("text", async (ctx) => {
  const userId = ctx.from.id.toString();
  const text = ctx.message.text;

  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();
  const userData = userDoc.data();

  // Handle Withdrawal Phone Number
  if (userData?.awaitingWithdrawal) {
    const amountPoints = userData.balance;
    const amountUsd = (amountPoints / POINTS_PER_DOLLAR).toFixed(2);

    // Create withdrawal request
    const withdrawalRef = await db.collection("withdrawals").add({
      userId: userId,
      username: ctx.from.username || ctx.from.first_name,
      amount: amountPoints,
      telebirrNumber: text,
      status: "pending",
      createdAt: new Date().toISOString()
    });

    await userRef.update({ awaitingWithdrawal: false, balance: 0 }); // Deduct balance immediately

    ctx.replyWithMarkdown(`✅ *Withdrawal request successfully submitted!*\n\nAmount: $${amountUsd}\nTelebirr: ${text}\n\nPlease wait 6-24 working hours for processing.`);

    // Notify Admin
    const adminMsg = `🚨 *New Withdrawal Request*\n\n👤 User: @${ctx.from.username || "N/A"} (${userId})\n💰 Amount: $${amountUsd} (${amountPoints} pts)\n📱 Telebirr: ${text}`;
    
    await bot.telegram.sendMessage(ADMIN_ID, adminMsg, Markup.inlineKeyboard([
      [Markup.button.callback("✅ Approve", `approve_${withdrawalRef.id}`), Markup.button.callback("❌ Reject", `reject_${withdrawalRef.id}`)]
    ]));
    return;
  }

  // Handle Admin Link Updates
  if (userId === ADMIN_ID) {
    if (text.startsWith("/set_task ")) {
      const link = text.split(" ")[1];
      await db.collection("settings").doc("global").set({ startEarningLink: link }, { merge: true });
      ctx.reply(`✅ Task link updated to: ${link}`);
      return;
    }
    if (text.startsWith("/set_support ")) {
      const link = text.split(" ")[1];
      await db.collection("settings").doc("global").set({ supportLink: link }, { merge: true });
      ctx.reply(`✅ Support link updated to: ${link}`);
      return;
    }
    if (text === "/setup") {
      if (APP_URL && APP_URL.startsWith("https")) {
        const webhookUrl = `${APP_URL}/api/webhook`;
        try {
          await bot.telegram.setWebhook(webhookUrl);
          ctx.reply(`✅ Webhook successfully set to:\n${webhookUrl}`);
        } catch (e) {
          ctx.reply(`❌ Failed to set webhook: ${e instanceof Error ? e.message : String(e)}`);
        }
      } else {
        ctx.reply("❌ APP_URL is not set or is not an HTTPS URL. Webhook cannot be set automatically.");
      }
      return;
    }
  }
});

// Admin Actions
bot.action("admin_panel", async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  
  const msg = `*Admin Panel* 🛠\n\nUse commands to update links:\n\n\`/set_task [link]\`\n\`/set_support [link]\``;
  ctx.replyWithMarkdown(msg);
});

bot.action(/^approve_(.+)$/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const withdrawalId = ctx.match[1];
  const withdrawalRef = db.collection("withdrawals").doc(withdrawalId);
  const withdrawalDoc = await withdrawalRef.get();
  
  if (withdrawalDoc.exists && withdrawalDoc.data()?.status === "pending") {
    await withdrawalRef.update({ status: "approved" });
    const data = withdrawalDoc.data();
    try {
      await bot.telegram.sendMessage(data?.userId, "🎉 *Your withdrawal request has been successfully paid!* Check your Telebirr account.");
    } catch (e) {}
    ctx.editMessageText(`✅ Withdrawal ${withdrawalId} Approved.`);
  }
});

bot.action(/^reject_(.+)$/, async (ctx) => {
  if (ctx.from.id.toString() !== ADMIN_ID) return;
  const withdrawalId = ctx.match[1];
  const withdrawalRef = db.collection("withdrawals").doc(withdrawalId);
  const withdrawalDoc = await withdrawalRef.get();
  
  if (withdrawalDoc.exists && withdrawalDoc.data()?.status === "pending") {
    const data = withdrawalDoc.data();
    // Refund balance
    await db.collection("users").doc(data?.userId).update({
      balance: admin.firestore.FieldValue.increment(data?.amount)
    });
    await withdrawalRef.update({ status: "rejected" });
    try {
      await bot.telegram.sendMessage(data?.userId, "❌ *Your withdrawal request was rejected.* Your points have been refunded.");
    } catch (e) {}
    ctx.editMessageText(`❌ Withdrawal ${withdrawalId} Rejected.`);
  }
});

// --- Express Server Setup ---
const app = express();

async function startServer() {
  const PORT = 3000;

  app.use(express.json());

  // Webhook endpoint
  app.post("/api/webhook", (req, res) => {
    console.log("📥 Received Webhook Update:", JSON.stringify(req.body));
    bot.handleUpdate(req.body);
    res.sendStatus(200);
  });

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      const webhookInfo = await bot.telegram.getWebhookInfo();
      res.json({ 
        status: "ok", 
        webhook: webhookInfo,
        appUrl: APP_URL,
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL
      });
    } catch (e) {
      res.json({ status: "ok", error: "Could not fetch webhook info" });
    }
  });

  // Manual setup route for browser
  app.get("/api/setup", async (req, res) => {
    if (APP_URL && APP_URL.startsWith("https")) {
      const webhookUrl = `${APP_URL}/api/webhook`;
      try {
        await bot.telegram.setWebhook(webhookUrl);
        res.send(`✅ Webhook successfully set to: ${webhookUrl}`);
      } catch (e) {
        res.status(500).send(`❌ Failed to set webhook: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      res.status(400).send("❌ APP_URL is not set or is not an HTTPS URL. Set it in your environment variables.");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Set Telegram Webhook
  if (APP_URL && APP_URL.startsWith("https")) {
    try {
      const webhookUrl = `${APP_URL}/api/webhook`;
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`✅ Webhook set to: ${webhookUrl}`);
    } catch (e) {
      console.error("❌ Failed to set webhook:", e);
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.log("⚠️ APP_URL is not set or not HTTPS. Starting bot in polling mode...");
    bot.launch().then(() => console.log("🤖 Bot started in polling mode"));
  }

  // Only listen if not running as a Vercel function
  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔗 APP_URL: ${APP_URL}`);
    });
  }
}

startServer();

export default app;
