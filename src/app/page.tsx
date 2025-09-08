'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">
            Crypto Trading Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Professional cryptocurrency trading with advanced tools
          </p>
          <div className="space-x-4">
            <Link 
              href="/dashboard"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Dashboard
            </Link>
            <Link 
              href="/login"
              className="bg-white text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium border border-gray-300"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}