'use client'

import React from "react";
import Image from 'next/image';

interface AuthLoginButtonProps {
  providerName: string;
  logoSrc: string;
  redirectUrl: string;
}

const AuthLoginButton: React.FC<AuthLoginButtonProps> = ({
  providerName,
  logoSrc,
  redirectUrl,
}) => {
  const handleClick = () => {
    window.location.href = redirectUrl;
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition"
    >
      <Image
        src = {logoSrc}
        alt = {'${providerName} logo'}
        width={105}
        height={105}
        className="mr-3"
      />
      <span>Login with {providerName}</span>
    </button>
  );
};

export default AuthLoginButton;