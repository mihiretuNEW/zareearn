import React from "react";
import { motion } from "motion/react";
import { Wallet, Users, ArrowRight, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500 selection:text-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <span className="inline-block py-1 px-3 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-semibold tracking-wider uppercase mb-6">
              Now Live on Telegram
            </span>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              Earn Rewards <br /> with ZareEarn
            </h1>
            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
              The most trusted Telegram bot for earning rewards through tasks and referrals. 
              Join thousands of users already earning daily.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://t.me/zareearn_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative px-8 py-4 bg-orange-500 text-black font-bold rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                Launch Bot <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="https://t.me/zareearn"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-xl transition-all hover:bg-white/10 flex items-center gap-2"
              >
                Join Channel
              </a>
            </div>
          </motion.div>
        </div>
        
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-white/5 border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-orange-500" />}
              title="Instant Tasks"
              description="Complete simple tasks and watch your balance grow in real-time. No complex requirements."
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6 text-blue-500" />}
              title="Referral Program"
              description="Earn $0.05 for every friend who joins. Unlimited referrals, unlimited potential."
            />
            <FeatureCard 
              icon={<Wallet className="w-6 h-6 text-green-500" />}
              title="Fast Withdrawals"
              description="Withdraw your earnings directly to Telebirr. Processed within 6-24 hours."
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-16">Why Choose ZareEarn?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            <StatItem label="Active Users" value="10K+" />
            <StatItem label="Total Paid" value="$5,000+" />
            <StatItem label="Min Withdrawal" value="$2.00" />
            <StatItem label="Support" value="24/7" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10 text-center text-white/40 text-sm">
        <p>&copy; 2024 ZareEarn. All rights reserved.</p>
        <div className="mt-4 flex justify-center gap-6">
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="https://t.me/miihiretu" className="hover:text-white transition-colors">Contact Admin</a>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors group">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-white/60 leading-relaxed">{description}</p>
    </div>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <div className="text-5xl font-bold text-orange-500 mb-2">{value}</div>
      <div className="text-white/40 uppercase tracking-widest text-xs font-bold">{label}</div>
    </div>
  );
}
