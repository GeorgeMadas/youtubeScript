"use client";

import { useRef, useEffect } from 'react';
import { useAuth } from '../lib/hooks/useAuth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"
      >
        <h2 className="text-xl font-bold text-white mb-6 text-center">Log In</h2>
        
        <div className="flex flex-col space-y-4">
          <button
            onClick={async () => {
              await signInWithGoogle();
              onClose();
            }}
            className="flex items-center justify-center bg-white text-gray-700 font-semibold py-3 px-4 rounded-md border border-gray-300 hover:bg-gray-100 transition duration-300 ease-in-out"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="w-6 h-6 mr-2" />
            Sign in with Google
          </button>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm font-medium mt-4 text-center"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
} 