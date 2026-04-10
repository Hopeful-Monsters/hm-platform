"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Menu,
  X,
  Home,
  Users,
  BarChart3,
  Settings,
  Shield,
  LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/app-store"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/expenses-manager", label: "Expenses", icon: BarChart3 },
  { href: "/coverage-tracker", label: "Coverage", icon: Shield },
  { href: "/admin", label: "Admin", icon: Settings, adminOnly: true },
]

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
  userRole?: string
  userTools: string[]
}

function MobileNav({ isOpen, onClose, userRole, userTools }: MobileNavProps) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(item => {
    if (item.adminOnly && userRole !== 'admin') return false
    if (item.href === '/expenses-manager' && !userTools.includes('expenses-manager')) return false
    if (item.href === '/coverage-tracker' && !userTools.includes('coverage-tracker')) return false
    return true
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Mobile menu */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-80 bg-background border-l shadow-xl"
          >
            <div className="flex h-16 items-center justify-between border-b px-6">
              <h2 className="text-lg font-semibold">Menu</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <nav className="flex flex-col p-6 space-y-2">
              {filteredItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

interface DesktopNavProps {
  userRole?: string
  userTools: string[]
}

function DesktopNav({ userRole, userTools }: DesktopNavProps) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(item => {
    if (item.adminOnly && userRole !== 'admin') return false
    if (item.href === '/expenses-manager' && !userTools.includes('expenses-manager')) return false
    if (item.href === '/coverage-tracker' && !userTools.includes('coverage-tracker')) return false
    return true
  })

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {filteredItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export { MobileNav, DesktopNav }