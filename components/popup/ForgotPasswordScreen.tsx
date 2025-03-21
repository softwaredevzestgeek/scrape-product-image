import { sendPasswordResetEmail } from "firebase/auth"
import React, { useState } from "react"

import { firebaseAuth } from "~firebase/config"
import { getFirebaseErrorMessage } from "~utils/error"

type ForgotPasswordProps = {
  onBackToLogin: () => void
}

export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState<string>("")
  const [authLoading, setAuthLoading] = useState<boolean>(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)

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

  return (
    <div className="p-4">
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-medium text-center mb-4">Reset Password</h2>

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
              onClick={onBackToLogin}
              className="text-[#ff9900] hover:text-[#e68a00] text-sm font-medium">
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
