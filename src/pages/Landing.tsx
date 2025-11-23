import React from 'react';
import { Link } from 'react-router-dom';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl md:text-8xl font-semibold text-contrastBlock mb-12">
          Filter
        </h1>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/privacy"
            className="text-accent hover:text-secondary transition-colors text-lg underline"
          >
            Privacy Policy
          </Link>
          <span className="text-textSecondary hidden sm:inline">•</span>
          <Link
            to="/terms"
            className="text-accent hover:text-secondary transition-colors text-lg underline"
          >
            Terms and Conditions
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;

