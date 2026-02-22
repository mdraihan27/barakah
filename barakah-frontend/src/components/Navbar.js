import React, { useState, useEffect } from 'react';

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    
      <nav
        className="fixed top-4 w-3/5 right-0 z-50"
      >
        <div className="mx-auto  px-4 sm:px-6 md:px-10">
          <div
            className={`flex items-center justify-between rounded-2xl px-5 py-3 transition-all duration-300 `}
          >
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 group">
              
              <span className="font-cerialebaran text-primary-green-1 text-xl tracking-wide">
                Barakah
              </span>
            </a>

            {/* Auth Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button className="px-4 py-2 text-sm font-poppins font-medium text-primary-green-1 rounded-lg  border-primary-green-1/20 transition-all duration-300 hover:bg-primary-green-1/10">
                About Us
              </button>
              <button className="px-4 py-2 text-sm font-poppins font-medium text-primary-green-1 rounded-lg  border-primary-green-1/20 transition-all duration-300 hover:bg-primary-green-1/10">
                Terms
              </button>
              <button className="px-4 py-2 text-sm font-poppins font-medium text-primary-green-1 rounded-lg  border-primary-green-1/20 transition-all duration-300 hover:bg-primary-green-1/10">
                Login
              </button>
              <button className="px-5 py-2 text-sm font-poppins font-semibold text-primary-white-1 bg-primary-green-1 rounded-lg transition-all duration-300 hover:bg-primary-green-2 hover:shadow-lg hover:shadow-black/10 active:translate-y-px">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>
    
  );
}

export default Navbar;
