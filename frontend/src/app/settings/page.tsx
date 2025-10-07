'use client'

import { useState } from 'react'
import { 
  User, Bell, Shield, Smartphone, Database, 
  Globe, Save, Camera, Check 
} from 'lucide-react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [saved, setSaved] = useState(false)
  
  const [profile, setProfile] = useState({
    name: 'Khaled',
    email: 'khaled@example.com',
    phone: '+962XXXXXXXXX',
    role: 'Parent',
  })
  
  const [notifications, setNotifications] = useState({
    whatsapp: true,
    email: false,
    browser: true,
    feedingReminders: true,
    sleepReminders: true,
    healthAlerts: true,
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'children', label: 'Children', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'data', label: 'Data Export', icon: Database },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>
        {saved && (
          <div className="flex items-center space-x-2 text-green-600">
            <Check className="w-5 h-5" />
            <span>Saved successfully</span>
          </div>
        )}
      </div>

      <div className="flex space-x-6">
        {/* Sidebar */}
        <div className="w-64">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <button onClick={handleSave} className="btn-primary">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'children' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👧</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">Samar</h3>
                    <p className="text-sm text-gray-600">Born: December 15, 2024</p>
                    <p className="text-sm text-gray-600">Gender: Female</p>
                    <button className="mt-2 text-sm text-primary-600 hover:text-primary-700">
                      Edit Profile
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👧</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">Maryam</h3>
                    <p className="text-sm text-gray-600">Born: December 15, 2024</p>
                    <p className="text-sm text-gray-600">Gender: Female</p>
                    <button className="mt-2 text-sm text-primary-600 hover:text-primary-700">
                      Edit Profile
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">WhatsApp Notifications</span>
                  <input
                    type="checkbox"
                    checked={notifications.whatsapp}
                    onChange={(e) => setNotifications({ ...notifications, whatsapp: e.target.checked })}
                    className="w-4 h-4"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Email Notifications</span>
                  <input
                    type="checkbox"
                    checked={notifications.email}
                    onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                    className="w-4 h-4"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Browser Push Notifications</span>
                  <input
                    type="checkbox"
                    checked={notifications.browser}
                    onChange={(e) => setNotifications({ ...notifications, browser: e.target.checked })}
                    className="w-4 h-4"
                  />
                </label>
                
                <hr className="my-4" />
                
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Feeding Reminders</span>
                  <input
                    type="checkbox"
                    checked={notifications.feedingReminders}
                    onChange={(e) => setNotifications({ ...notifications, feedingReminders: e.target.checked })}
                    className="w-4 h-4"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-gray-700">Sleep Reminders</span>
                  <input
                    type="checkbox"
                    checked={notifications.sleepReminders}
                    onChange={(e) => setNotifications({ ...notifications, sleepReminders: e.target.checked })}
                    className="w-4 h-4"
                  />
                </label>
                
                <button onClick={handleSave} className="btn-primary">
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">WhatsApp Integration</h2>
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-green-900">Connected Number</p>
                  <p className="text-lg text-green-700">+962 XXX XXX XXX</p>
                </div>
                
                <div>
                  <p className="text-gray-700 mb-2">Send a message to the bot:</p>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <code className="text-sm">+1 234 567 8900</code>
                  </div>
                </div>
                
                <button className="btn-secondary">
                  Reconnect WhatsApp
                </button>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Privacy & Security</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Data Encryption</h3>
                  <p className="text-sm text-gray-600">All your data is encrypted at rest and in transit</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Account Security</h3>
                  <button className="btn-secondary">Change Password</button>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Delete Account</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    This will permanently delete all your data
                  </p>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Data Export</h2>
              <div className="space-y-4">
                <p className="text-gray-700">
                  Export your data for backup or to share with healthcare providers
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex items-center justify-center space-x-2 p-4 border-2 border-gray-300 rounded-lg hover:border-primary-500">
                    <Database className="w-5 h-5" />
                    <span>Export as CSV</span>
                  </button>
                  
                  <button className="flex items-center justify-center space-x-2 p-4 border-2 border-gray-300 rounded-lg hover:border-primary-500">
                    <Database className="w-5 h-5" />
                    <span>Export as PDF</span>
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>Last 3 months</option>
                    <option>All time</option>
                  </select>
                </div>
                
                <button className="btn-primary">
                  Generate Export
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
