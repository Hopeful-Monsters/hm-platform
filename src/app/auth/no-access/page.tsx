export default function NoAccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow text-center">
        <h2 className="text-3xl font-bold">Access Denied</h2>
        <p className="text-gray-600">
          You do not have permission to access this tool. Your account may be pending approval.
        </p>
        <p className="text-gray-600">
          Please contact an administrator or check back later.
        </p>
        <a href="/auth/login" className="text-blue-500">Back to Login</a>
      </div>
    </div>
  )
}