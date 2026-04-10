import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, BarChart3, Users, CheckCircle } from 'lucide-react'
import SignOutButton from '@/components/SignOutButton'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const status = user?.user_metadata?.status
  const role = user?.user_metadata?.role

  // Get user's tool access
  let userTools: string[] = []
  if (user && status === 'approved') {
    const { data: toolAccess } = await supabase
      .from('tool_access')
      .select('tool_slug')
      .eq('user_id', user.id)
    userTools = toolAccess?.map(access => access.tool_slug) || []
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <motion.div
          className="container mx-auto px-4 py-16"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <motion.div className="text-center mb-16" variants={itemVariants}>
            <motion.h1
              className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              Hopeful Monsters
            </motion.h1>
            <motion.p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto" variants={itemVariants}>
              A comprehensive platform for managing expenses, tracking coverage, and streamlining administrative workflows.
            </motion.p>
            <motion.div className="flex flex-col sm:flex-row gap-4 justify-center" variants={itemVariants}>
              <Link href="/auth/signup">
                <Button size="lg" className="text-lg px-8 py-6">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                  Sign In
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Features Grid */}
          <motion.div className="grid md:grid-cols-3 gap-8 mb-16" variants={itemVariants}>
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border"
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Expenses Manager</h3>
              <p className="text-muted-foreground">
                Track and manage expenses with detailed analytics and reporting tools.
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border"
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Coverage Tracker</h3>
              <p className="text-muted-foreground">
                Monitor coverage metrics and ensure compliance with comprehensive tracking.
              </p>
            </motion.div>

            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border"
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Admin Dashboard</h3>
              <p className="text-muted-foreground">
                Powerful administrative tools for user management and system oversight.
              </p>
            </motion.div>
          </motion.div>

          {/* CTA Section */}
          <motion.div className="text-center bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-xl border" variants={itemVariants}>
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join our platform and gain access to powerful tools designed to streamline your workflow.
              Sign up today and get approved access to all features.
            </p>
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-8 py-6">
                Create Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <motion.div
        className="container mx-auto px-4 py-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Welcome Section */}
        <motion.div className="text-center mb-16" variants={itemVariants}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome back, {user.email?.split('@')[0]}!
          </h1>
          <p className="text-xl text-muted-foreground">
            {status === 'approved'
              ? 'You have access to your personalized dashboard'
              : 'Your account is pending approval'
            }
          </p>
        </motion.div>

        {status === 'approved' ? (
          <motion.div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" variants={itemVariants}>
            {userTools.includes('coverage-tracker') && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/coverage-tracker">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border hover:shadow-xl transition-shadow">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                      <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Coverage Tracker</h3>
                    <p className="text-muted-foreground mb-4">
                      Monitor and manage coverage metrics with detailed analytics.
                    </p>
                    <Button className="w-full">
                      Open Tracker
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </Link>
              </motion.div>
            )}

            {userTools.includes('expenses-manager') && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/expenses-manager">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border hover:shadow-xl transition-shadow">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                      <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Expenses Manager</h3>
                    <p className="text-muted-foreground mb-4">
                      Track and analyze expenses with comprehensive reporting tools.
                    </p>
                    <Button className="w-full">
                      Open Manager
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </Link>
              </motion.div>
            )}

            {role === 'admin' && (
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href="/admin">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border hover:shadow-xl transition-shadow">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                      <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Admin Dashboard</h3>
                    <p className="text-muted-foreground mb-4">
                      Manage users, approvals, and system settings.
                    </p>
                    <Button className="w-full">
                      Open Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </Link>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            className="max-w-2xl mx-auto text-center bg-white dark:bg-gray-800 rounded-xl p-12 shadow-lg border"
            variants={itemVariants}
          >
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Account Pending Approval</h2>
            <p className="text-muted-foreground mb-8">
              Your account has been created successfully! An administrator will review and approve your access soon.
              You'll receive an email notification once approved.
            </p>
            <div className="flex justify-center">
              <SignOutButton />
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
