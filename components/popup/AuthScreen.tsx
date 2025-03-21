import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword
} from "firebase/auth"
import React, { useState } from "react"

import { firebaseAuth } from "~firebase/config"
import { getFirebaseErrorMessage } from "~utils/error"

export function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState<boolean>(false)
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false)
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [authLoading, setAuthLoading] = useState<boolean>(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)

  const handleEmailAuth = async () => {
    setAuthLoading(true)
    setAuthError(null)

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(firebaseAuth, email, password)
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email, password)
      }
    } catch (error) {
      console.log("Auth error:", error)
      setAuthError(getFirebaseErrorMessage(error, isSignUp))
    } finally {
      setAuthLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    setAuthLoading(true)
    setAuthError(null)
    setResetSuccess(null)

    try {
      await sendPasswordResetEmail(firebaseAuth, email)
      setResetSuccess(`Password reset email sent to ${email}`)
    } catch (error) {
      setAuthError(getFirebaseErrorMessage(error))
    } finally {
      setAuthLoading(false)
    }
  }

  // Forgot password screen
  if (isForgotPassword) {
    return (
      <div className="p-4">
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-medium text-center mb-4">
            Reset Password
          </h2>

          {authError && (
            <div className="mb-4 p-2 bg-red-100 text-red-800 border border-red-300 rounded-lg text-sm">
              {authError}
            </div>
          )}

          {resetSuccess && (
            <div className="mb-4 p-2 bg-green-100 text-green-800 border border-green-300 rounded-lg text-sm">
              {resetSuccess}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#ff9900]"
                placeholder="your@email.com"
                disabled={authLoading}
              />
            </div>

            <button
              onClick={handlePasswordReset}
              disabled={authLoading || !email}
              className="w-full py-2 rounded-lg font-bold text-[#111] transition disabled:opacity-50
                       bg-gradient-to-r from-[#f0c14b] to-[#ff9900]
                       hover:bg-gradient-to-r hover:from-[#e6b93e] hover:to-[#ff8c00]">
              {authLoading ? "Processing..." : "Send Reset Link"}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false)
                  setAuthError(null)
                  setResetSuccess(null)
                }}
                className="text-[#ff9900] hover:text-[#e68a00] text-sm font-medium">
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Login/Signup screen
  return (
    <div className="p-4">
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-medium text-center mb-4">
          {isSignUp ? "Create an Account" : "Sign In"}
        </h2>

        {authError && (
          <div className="mb-4 p-2 bg-red-100 text-red-800 border border-red-300 rounded-lg text-sm">
            {authError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#ff9900]"
              placeholder="your@email.com"
              disabled={authLoading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#ff9900]"
              placeholder="••••••••"
              disabled={authLoading}
            />
          </div>

          <button
            onClick={handleEmailAuth}
            disabled={authLoading || !email || !password}
            className="w-full py-2 rounded-lg font-bold text-[#111] transition disabled:opacity-50
                     bg-gradient-to-r from-[#f0c14b] to-[#ff9900]
                     hover:bg-gradient-to-r hover:from-[#e6b93e] hover:to-[#ff8c00]">
            {authLoading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>

          <div className="text-center mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[#ff9900] hover:text-[#e68a00] text-sm font-medium">
              {isSignUp
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </button>

            {!isSignUp && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-[#ff9900] hover:text-[#e68a00] text-sm font-medium">
                Forgot password?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
