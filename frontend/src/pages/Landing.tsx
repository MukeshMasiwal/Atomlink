import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Menu, 
  X, 
  Lock, 
  Zap, 
  Server, 
  EyeOff,
  Video,
  MessageSquare,
  MonitorUp,
  FileUp,
  History,
  LayoutDashboard,
  CheckCircle2
} from 'lucide-react';
import './Landing.css';

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const navigate = useNavigate();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        // offset for sticky header
        const y = element.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'features', 'pricing', 'about', 'contact'];
      let current = 'home';

      for (const section of sections) {
        if (section === 'home') continue;
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100) {
            current = section;
          }
        }
      }
      
      if (window.scrollY < 100) {
        current = 'home';
      }
      
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-wrapper">
      {/* Navbar */}
      <div className="landing-nav-wrapper">
        <div className="landing-container landing-navbar">
          <Link to="/" className="nav-logo" onClick={(e) => handleNavClick(e, 'home')}>
            <div className="nav-logo-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19 12c0-3.866-3.134-7-7-7s-7 3.134-7 7 3.134 7 7 7 7-3.134 7-7z" transform="rotate(60 12 12)"></path>
                <path d="M19 12c0-3.866-3.134-7-7-7s-7 3.134-7 7 3.134 7 7 7 7-3.134 7-7z" transform="rotate(120 12 12)"></path>
              </svg>
            </div>
            AtomLink
          </Link>

          <nav className={`nav-links ${isMobileMenuOpen ? 'open' : ''}`}>
            <a href="#home" className={`nav-item ${activeSection === 'home' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, 'home')}>Home</a>
            <a href="#features" className={`nav-item ${activeSection === 'features' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, 'features')}>Features</a>
            <a href="#pricing" className={`nav-item ${activeSection === 'pricing' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, 'pricing')}>Pricing</a>
            <a href="#about" className={`nav-item ${activeSection === 'about' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, 'about')}>About</a>
            <a href="#contact" className={`nav-item ${activeSection === 'contact' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, 'contact')}>Contact</a>
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="nav-btn-login">Login</button>
            <div className="hamburger" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="section-hero" id="home">
        <div className="landing-container hero-grid">
          <div className="hero-content">
            <div className="hero-badge">
              <ShieldCheck size={16} />
              Secure collaboration built for fast-moving teams
            </div>
            <h1 className="hero-title">
              Connect seamlessly<br />with <span>AtomLink</span>
            </h1>
            <p className="hero-subtitle">
              Secure, real-time video meetings, collaboration, and file sharing built on your own infrastructure for ultimate privacy.
            </p>
            <div className="hero-ctas">
              <button onClick={() => navigate('/login')} className="btn-solid">Get Started</button>
              <button onClick={(e) => handleNavClick(e as any, 'features')} className="btn-outline">Learn More</button>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="visual-mockup">
              <img src="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&q=80&w=800&h=500" alt="Video Dashboard Mockup" />
            </div>
            <div className="visual-badge">
              <Lock size={20} />
              End-to-End Secure
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <div className="section-highlights">
        <div className="landing-container highlights-flex">
          <div className="highlight-item"><Lock size={20} /> End-to-End Encryption</div>
          <div className="highlight-item"><Zap size={20} /> Low Latency</div>
          <div className="highlight-item"><Server size={20} /> Self-Hosted</div>
          <div className="highlight-item"><EyeOff size={20} /> Privacy First</div>
        </div>
      </div>

      {/* Features Section */}
      <section className="section-features" id="features">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">Everything your team needs</h2>
            <p className="section-subtitle">AtomLink provides a complete suite of collaboration tools in one simple, secure platform.</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper"><Video size={24} /></div>
              <h3>Video Meetings</h3>
              <p>Crystal clear HD video meetings with zero lag, built for teams of any size.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><MessageSquare size={24} /></div>
              <h3>Real-Time Chat</h3>
              <p>Instant messaging that stays in sync, even during intense video sessions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><MonitorUp size={24} /></div>
              <h3>Screen Sharing</h3>
              <p>Share your work instantly with lightweight controls and high resolution.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><FileUp size={24} /></div>
              <h3>File Sharing</h3>
              <p>Securely transfer documents and assets within the room instantly.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><History size={24} /></div>
              <h3>Meeting History</h3>
              <p>Keep track of past sessions and easily revisit important decisions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><LayoutDashboard size={24} /></div>
              <h3>Admin Dashboard</h3>
              <p>Comprehensive controls to manage users, rooms, and permissions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="section-pricing" id="pricing">
        <div className="landing-container">
          <div className="section-header">
            <h2 className="section-title">Simple, transparent pricing</h2>
            <p className="section-subtitle">Choose the perfect plan for your team's secure collaboration needs.</p>
          </div>

          <div className="pricing-grid">
            {/* Basic */}
            <div className="pricing-card">
              <h3 className="pricing-tier">Basic</h3>
              <div className="pricing-amount">$0<span>/mo</span></div>
              <p className="pricing-desc">Perfect for small teams getting started with secure meetings.</p>
              <ul className="pricing-features">
                <li><CheckCircle2 size={18} /> Up to 5 participants</li>
                <li><CheckCircle2 size={18} /> Basic screen sharing</li>
                <li><CheckCircle2 size={18} /> Community support</li>
              </ul>
              <button className="pricing-btn btn-light" onClick={() => navigate('/login')}>Get Started</button>
            </div>

            {/* Pro */}
            <div className="pricing-card popular">
              <div className="popular-badge">Most Popular</div>
              <h3 className="pricing-tier">Pro</h3>
              <div className="pricing-amount">$15<span>/mo</span></div>
              <p className="pricing-desc">Advanced features for growing teams and regular collaboration.</p>
              <ul className="pricing-features">
                <li><CheckCircle2 size={18} /> Up to 50 participants</li>
                <li><CheckCircle2 size={18} /> Unlimited file sharing</li>
                <li><CheckCircle2 size={18} /> Priority support</li>
                <li><CheckCircle2 size={18} /> Meeting history</li>
              </ul>
              <button className="pricing-btn btn-solid" onClick={() => navigate('/login')}>Start Free Trial</button>
            </div>

            {/* Enterprise */}
            <div className="pricing-card">
              <h3 className="pricing-tier">Enterprise</h3>
              <div className="pricing-amount">Custom</div>
              <p className="pricing-desc">Full control and custom infrastructure for large organizations.</p>
              <ul className="pricing-features">
                <li><CheckCircle2 size={18} /> Unlimited participants</li>
                <li><CheckCircle2 size={18} /> Self-hosted option</li>
                <li><CheckCircle2 size={18} /> 24/7 dedicated support</li>
                <li><CheckCircle2 size={18} /> Custom SSO & Roles</li>
              </ul>
              <button className="pricing-btn btn-light">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="section-about" id="about">
        <div className="landing-container about-grid">
          <div className="about-text">
            <h2>Built for modern privacy</h2>
            <p>
              AtomLink was created with a simple premise: your communications belong to you. 
              By leveraging direct WebRTC connections and self-hosted infrastructure, we remove 
              third-party surveillance from your most important conversations.
            </p>
            <p>
              Our team consists of security researchers and open-source advocates dedicated 
              to building tools that empower rather than exploit.
            </p>
            <button onClick={(e) => handleNavClick(e as any, 'contact')} className="btn-outline" style={{ marginTop: '16px' }}>Contact Us</button>
          </div>
          <div className="about-illustration">
             <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800&h=600" alt="Team collaborating" />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="section-contact" id="contact">
        <div className="landing-container">
          <div className="contact-container">
            <h2>Get in touch</h2>
            <p>Have questions about AtomLink? Drop us a message below.</p>
            
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" className="form-input" placeholder="hello@yourcompany.com" required />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea className="form-textarea" placeholder="How can we help?" required></textarea>
              </div>
              <button type="submit" className="btn-submit">Send Message</button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <p>&copy; {new Date().getFullYear()} AtomLink. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
