"use client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Leaf, ScanLine, Award, MapPin, Cpu, ShieldCheck, BarChart3, ArrowRight } from "lucide-react";
import { LandingHeader } from "@/components/LandingHeader";
import { Button } from "@/components/ui";
import s from "@/styles/LandingPage.module.css";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className={s.container}>
      <LandingHeader />
      
      <main>
        {/* Hero Section */}
        <section className={s.hero}>
          <div className={s.heroBg} />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={s.badge}
          >
            <Leaf size={16} /> Eco-Friendly Future
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={s.title}
          >
            Recycle Smart. <br /> Earn Rewards.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={s.subtitle}
          >
            Drop your e-waste into our AI-powered smart bins, track your environmental impact, and earn points for a sustainable future.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={s.heroButtons}
          >
            <Button size="lg" style={{ fontSize: '16px', padding: '12px 24px' }} onClick={() => router.push("/auth/login")}>
              Get Started <ArrowRight size={18} style={{marginLeft: '8px'}}/>
            </Button>
            <button 
              onClick={() => { document.getElementById("how-it-works").scrollIntoView({ behavior: "smooth" }) }}
              style={{ 
                fontSize: '16px', padding: '12px 24px', background: 'var(--surface)', 
                border: '1px solid var(--border)', color: 'var(--text)', 
                borderRadius: 'var(--r-md)', cursor: 'pointer', fontWeight: 600 
              }}
            >
              Learn More
            </button>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className={s.steps}>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>How It Works</h2>
            <p className={s.sectionSubtitle}>Recycling your electronics has never been this simple.</p>
          </div>
          
          <div className={s.stepList}>
            {[
              { num: "01", title: "Locate a Bin", desc: "Find the nearest eBin smart recycling station using our interactive map. Bins are located in convenient public areas.", icon: <MapPin size={64} /> },
              { num: "02", title: "Scan & Drop", desc: "Scan the QR code on the bin with your app. Our AI instantly classifies your e-waste as you drop it in.", icon: <ScanLine size={64} /> },
              { num: "03", title: "Earn Points", desc: "Watch your impact grow. Earn reward points for every item recycled and redeem them for eco-friendly prizes.", icon: <Award size={64} /> }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5 }}
                className={s.stepItem}
              >
                <div className={s.stepContent}>
                  <span className={s.stepNum}>Step {step.num}</span>
                  <h3 className={s.stepTitle}>{step.title}</h3>
                  <p className={s.stepDesc}>{step.desc}</p>
                </div>
                <div className={s.stepImage}>
                  {step.icon}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className={s.features}>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>Smart Technology</h2>
            <p className={s.sectionSubtitle}>Powered by cutting-edge AI to make recycling efficient and secure.</p>
          </div>
          
          <div className={s.featureGrid}>
            {[
              { title: "AI Classification", desc: "Our built-in cameras use machine learning to identify and sort your e-waste instantly.", icon: <Cpu /> },
              { title: "Secure Data Wiping", desc: "We guarantee physical destruction or secure data wiping for all data-bearing devices.", icon: <ShieldCheck /> },
              { title: "Impact Tracking", desc: "Monitor your personal environmental impact with detailed charts and statistics.", icon: <BarChart3 /> }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={s.featureCard}
              >
                <div className={s.featureIcon}>{feature.icon}</div>
                <h3 className={s.featureTitle}>{feature.title}</h3>
                <p className={s.featureDesc}>{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className={s.cta}>
          <h2 className={s.ctaTitle}>Ready to make an impact?</h2>
          <p className={s.ctaDesc}>Join thousands of users who are already saving the planet, one device at a time.</p>
          <Button size="lg" style={{ background: 'var(--surface)', color: 'var(--accent)', fontSize: '18px', padding: '14px 32px' }} onClick={() => router.push("/auth/login")}>
            Create an Account
          </Button>
        </section>
      </main>

      {/* Footer */}
      <footer className={s.footer}>
        <div className={s.footerGrid}>
          <div className={s.footerBrand}>
            <div className={s.logo}>
              <Leaf size={24} /> eBin
            </div>
            <p className={s.footerDesc}>
              Transforming electronic waste management with smart bins and AI technology.
            </p>
          </div>
          <div>
            <h4 className={s.footerColTitle}>Platform</h4>
            <div className={s.footerLinks}>
              <span onClick={() => { document.getElementById("how-it-works").scrollIntoView({ behavior: "smooth" }) }} style={{cursor: 'pointer'}}>How it Works</span>
              <span onClick={() => { document.getElementById("features").scrollIntoView({ behavior: "smooth" }) }} style={{cursor: 'pointer'}}>Features</span>
              <span onClick={() => router.push("/auth/login")} style={{cursor: 'pointer'}}>Sign In</span>
            </div>
          </div>
          <div>
            <h4 className={s.footerColTitle}>Legal</h4>
            <div className={s.footerLinks}>
              <span style={{cursor: 'pointer'}}>Privacy Policy</span>
              <span style={{cursor: 'pointer'}}>Terms of Service</span>
              <span style={{cursor: 'pointer'}}>Contact Us</span>
            </div>
          </div>
        </div>
        <div className={s.footerBottom}>
          © {new Date().getFullYear()} eBin. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
