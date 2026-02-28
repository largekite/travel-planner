// Monetized footer with legal links and affiliate disclosure
export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 bg-slate-900 text-white py-10">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-4 text-lg">About</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Smart travel planning made simple. Create personalized itineraries in seconds with curated local recommendations.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-lg">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/privacy" className="text-slate-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-slate-400 hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/affiliate-disclosure" className="text-slate-400 hover:text-white transition-colors">
                  Affiliate Disclosure
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-lg">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/blog" className="text-slate-400 hover:text-white transition-colors">
                  Travel Blog
                </a>
              </li>
              <li>
                <a href="/guides" className="text-slate-400 hover:text-white transition-colors">
                  Destination Guides
                </a>
              </li>
              <li>
                <a href="/support" className="text-slate-400 hover:text-white transition-colors">
                  Support & FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-lg">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/about" className="text-slate-400 hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="/contact" className="text-slate-400 hover:text-white transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a href="/careers" className="text-slate-400 hover:text-white transition-colors">
                  Careers
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8">
          <div className="text-sm text-slate-400 space-y-3">
            <p className="leading-relaxed">
              <strong className="text-white">Affiliate Disclosure:</strong> We may earn a commission from bookings made through our affiliate links (Booking.com, Viator, GetYourGuide) at no extra cost to you. This helps us keep the service free and continuously improve our recommendations.
            </p>
            <p className="text-xs opacity-75">
              © {currentYear} Largekite Travel Planner. All rights reserved. Powered by Google Places & Unsplash.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
