'use client'

import React from "react";
import AuthLoginButton from "../../components/AuthLoginButton";

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="bg-white p-8 rounded-xl shadow-md flex flex-col items-center w-full max-w-sm">
        <h1 className="text-4xl font-bold mb-6 text-center text-black">
          Welcome to FlowMinder
        </h1>
        <AuthLoginButton
          providerName="Zoom"
          logoSrc="/zoom_logo.png"
          // redirectUrl="http://localhost:4000/zoom/oauth"
          redirectUrl="https://flowminder-app.onrender.com/zoom/oauth"
        />
      </div>
    </div>
  )
}