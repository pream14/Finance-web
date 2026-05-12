'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  IndianRupee, BarChart3, Users, Building2, Smartphone, ShieldCheck,
  ArrowRight, CheckCircle, Star, ChevronRight, Phone, Mail, MapPin,
  BookOpen, TrendingUp, Clock, Zap
} from 'lucide-react'

/* ──────────────────── Scroll animation hook ──────────────────── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return { ref, isVisible }
}

function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

/* ──────────────────── Feature data ──────────────────── */
const FEATURES = [
  {
    icon: IndianRupee,
    title: 'Loan Management',
    description: 'Create and manage Daily Collection Loans, Monthly Interest Loans, and Daily interest Loans with automatic interest calculations.',
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
  },
  {
    icon: BarChart3,
    title: 'Real-time Cashbook',
    description: 'Track every transaction with a daily cashbook that auto-calculates opening and closing balances.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Users,
    title: 'Multi-user Access',
    description: 'Add owners and employees with role-based permissions. Track who collected what, when.',
    color: 'text-purple-600',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Building2,
    title: 'Multi-branch Support',
    description: 'Manage multiple branches from one account. Each branch gets its own isolated data and cashbook.',
    color: 'text-orange-600',
    bg: 'bg-orange-500/10',
  },
  {
    icon: Smartphone,
    title: 'Mobile Friendly',
    description: 'Works seamlessly on phones and tablets. Your collectors can update entries on the go.',
    color: 'text-pink-600',
    bg: 'bg-pink-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Audit & Security',
    description: 'Full edit history, security logs, and account lockout protection. Know who changed what.',
    color: 'text-teal-600',
    bg: 'bg-teal-500/10',
  },
]

const STEPS = [
  {
    step: '01',
    title: 'Sign Up & Create Your Organization',
    description: 'Register in under a minute. Set up your finance company with branches.',
    icon: Zap,
  },
  {
    step: '02',
    title: 'Add Customers & Create Loans',
    description: 'Add your customer details and create loans — DC, Monthly Interest, or DL.',
    icon: BookOpen,
  },
  {
    step: '03',
    title: 'Track Collections & Manage Finances',
    description: 'Record daily collections, track interest, manage expenses — all in one place.',
    icon: TrendingUp,
  },
]

const PRICING = [
  {
    name: 'Starter',
    price: '499',
    period: '/month',
    description: 'Perfect for small finance businesses',
    features: [
      '2 Users',
      '50 Customers',
      'DC & Interest Loans',
      'Daily Cashbook',
      'Collection Tracking',
      'Basic Reports',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'Professional',
    price: '999',
    period: '/month',
    description: 'For growing finance companies',
    features: [
      '5 Users',
      '200 Customers',
      'All Loan Types',
      'Multi-branch Support',
      'Advanced Reports & PDF Export',
      'Expense & Income Manager',
      'Interest Calendar',
      'Priority Support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Business',
    price: '1,999',
    period: '/month',
    description: 'For large operations with unlimited scale',
    features: [
      'Unlimited Users',
      'Unlimited Customers',
      'Everything in Professional',
      'Multi-owner Administration',
      'Full Audit Trail',
      'Dedicated Support',
      'Custom Integrations',
    ],
    cta: 'Start Free Trial',
    popular: false,
  },
]

const TESTIMONIALS = [
  {
    name: 'Rajesh Kumar',
    role: 'Finance Company Owner',
    text: 'This software replaced our manual ledger books. Now I can check my collections and balances from my phone anytime.',
    rating: 5,
  },
  {
    name: 'Priya Sundaram',
    role: 'Branch Manager',
    text: 'Managing 3 branches was chaotic before. Now each branch has its own cashbook and I can see everything in one dashboard.',
    rating: 5,
  },
  {
    name: 'Mohammed Farooq',
    role: 'Finance Business Owner',
    text: 'The interest tracking and overdue alerts save me hours every day. I never miss a collection date now.',
    rating: 5,
  },
]

/* ──────────────────── Landing Page ──────────────────── */
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ─── Navbar ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-card/95 backdrop-blur-md border-b border-border shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Name</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/auth/signup">Start Free Trial <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <RevealSection>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Smart Finance Management for Modern Businesses
              </div>
            </RevealSection>

            <RevealSection delay={100}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                Organize Your
                <span className="block text-primary mt-1">Money Lending Business</span>
              </h1>
            </RevealSection>

            <RevealSection delay={200}>
              <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Manage loans, record collections, track interest, and run your finance business — all from one powerful dashboard. No more paper ledgers.
              </p>
            </RevealSection>

            <RevealSection delay={300}>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-8 h-12">
                  <Link href="/auth/signup">
                    Start 10-Day Free Trial
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base px-8 h-12">
                  <a href="#features">
                    See Features
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </a>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                No credit card required • Set up in under 2 minutes
              </p>
            </RevealSection>
          </div>

          {/* Dashboard preview placeholder */}
          <RevealSection delay={400} className="mt-16 max-w-5xl mx-auto">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-blue-500/10 to-purple-500/20 rounded-2xl blur-2xl" />
              <Card className="relative border-border shadow-2xl overflow-hidden">
                <div className="bg-card p-4 border-b border-border flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-4 text-sm text-muted-foreground">Dashboard — Admin Panel</span>
                </div>
                <div className="p-6 sm:p-8 bg-muted/30">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: "Today's Collections", value: '₹47,500', color: 'text-blue-600', bg: 'bg-blue-500/10' },
                      { label: "Today's Revenue", value: '₹12,800', color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
                      { label: 'Active Loans', value: '234', color: 'text-purple-600', bg: 'bg-purple-500/10' },
                      { label: 'Outstanding', value: '₹18.5L', color: 'text-orange-600', bg: 'bg-orange-500/10' },
                    ].map((stat, i) => (
                      <div key={i} className="p-4 bg-card rounded-xl border border-border">
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className={`text-lg sm:text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-card rounded-xl border border-border">
                      <p className="text-sm font-medium text-foreground mb-3">Recent Collections</p>
                      {['Arun Kumar — ₹1,500', 'Suresh M — ₹2,200', 'Lakshmi V — ₹800'].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 py-2 border-b border-border/50 last:border-0">
                          <div className="w-6 h-6 bg-emerald-500/10 rounded flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                          </div>
                          <span className="text-sm text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-card rounded-xl border border-border">
                      <p className="text-sm font-medium text-foreground mb-3">Interest Due Today</p>
                      {['Muthu R — ₹3,000 (3%)', 'Kamal S — ₹1,800 (2.5%)', 'Gowri P — ₹2,400 (3%)'].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 py-2 border-b border-border/50 last:border-0">
                          <div className="w-6 h-6 bg-red-500/10 rounded flex items-center justify-center">
                            <Clock className="w-3 h-3 text-red-500" />
                          </div>
                          <span className="text-sm text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Everything You Need to Run Your Finance Business
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              From loan creation to daily collections — manage every aspect of your money lending operations digitally.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <RevealSection key={feature.title} delay={i * 100}>
                <Card className="border-border/50 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 h-full group">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-lg font-semibold text-foreground">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Get Started in 3 Simple Steps
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From signup to managing your first collection — it takes under 5 minutes.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <RevealSection key={step.step} delay={i * 150}>
                <div className="relative text-center">
                  {/* Connector line */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-border" />
                  )}
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6 relative">
                    <step.icon className="w-8 h-8 text-primary" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {step.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Section ─── */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start with a 10-day free trial. No credit card required.
            </p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING.map((plan, i) => (
              <RevealSection key={plan.name} delay={i * 150}>
                <Card className={`relative border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 h-full flex flex-col ${plan.popular ? 'border-primary shadow-lg scale-[1.02]' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-lg font-semibold text-foreground">{plan.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-4xl font-extrabold text-foreground">₹{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-3 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      className={`mt-6 w-full ${plan.popular ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      <Link href="/auth/signup">{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>



      {/* ─── CTA Banner ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="max-w-4xl mx-auto text-center">
          <RevealSection>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Ready to Digitize Your Finance Business?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop maintaining paper ledgers. Start managing your loans, collections, and finances the smart way.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground text-base px-10 h-12">
                <Link href="/auth/signup">
                  Start Your 10-Day Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No credit card required • Cancel anytime
            </p>
          </RevealSection>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer id="contact" className="border-t border-border bg-card py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                  <IndianRupee className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold text-foreground">Name</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-md">
                The complete finance management platform for money lending businesses. Manage loans, track collections, and grow your business digitally.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Login</Link></li>
                <li><Link href="/auth/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign Up</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a href="tel:+917418573018" className="text-sm text-muted-foreground hover:text-foreground transition-colors">+91 74185 73018</a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href="mailto:pream20041214@gmail.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">support@Name.com</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">

            <div className="flex gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
