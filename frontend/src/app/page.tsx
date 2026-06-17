import Link from 'next/link'
import { ArrowRight, Leaf, Shield, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem 1rem',
      textAlign: 'center'
    }}>
      <div className="auth-card" style={{ maxWidth: '640px', padding: '3.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.5rem' }}>
          <Sparkles size={14} />
          Welcome to the Milky Mushrooms Portal
        </div>
        
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', lineHeight: '1.1', background: 'linear-gradient(135deg, #FFF 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Pure Organic Calocybe Indica
        </h1>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
          Experience the premium standard in mushroom cultivation and customer logistics. Sign up to order spawn, trace payments, and access your order dashboard.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <span className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Access Dashboard <ArrowRight size={18} />
            </span>
          </Link>
          <Link href="/register" style={{ textDecoration: 'none' }}>
            <span className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Create an Account
            </span>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '3.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.15)', color: 'var(--primary)' }}>
              <Leaf size={20} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>100% Organic</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cultivated with natural substrates</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(139, 92, 246, 0.15)', color: '#A78BFA' }}>
              <Shield size={20} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Secured Portal</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Verified Supabase authentication</p>
          </div>
        </div>
      </div>
    </div>
  )
}
