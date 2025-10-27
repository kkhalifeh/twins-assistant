'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import {
  User, Bell, Shield, Smartphone, Database,
  Globe, Save, Camera, Check, Trash2, AlertTriangle, Users, UserPlus, X
} from 'lucide-react'
import { childrenAPI, authAPI, userAPI } from '@/lib/api'
import api from '@/lib/api'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [saved, setSaved] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'NANNY',
    password: ''
  })
  const [editingChild, setEditingChild] = useState<any | null>(null)
  const [showEditChildModal, setShowEditChildModal] = useState(false)
  const queryClient = useQueryClient()

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  })

  // Fetch current user data
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
  })

  // Fetch children data
  const { data: children = [], isLoading: childrenLoading } = useQuery({
    queryKey: ['children'],
    queryFn: childrenAPI.getAll,
  })

  // Fetch team members
  const { data: teamMembers = [], isLoading: teamLoading } = useQuery({
    queryKey: ['teamMembers'],
    queryFn: userAPI.getTeamMembers,
  })

  // Invite team member mutation
  const inviteMutation = useMutation({
    mutationFn: userAPI.inviteTeamMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
      setShowInviteModal(false)
      setInviteForm({ email: '', name: '', role: 'NANNY', password: '' })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      userAPI.updateMemberRole(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: userAPI.removeMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] })
      setShowDeleteConfirm(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  // Update child mutation
  const updateChildMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => childrenAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] })
      setShowEditChildModal(false)
      setEditingChild(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    inviteMutation.mutate(inviteForm)
  }

  const handleEditChild = (child: any) => {
    setEditingChild({
      id: child.id,
      name: child.name,
      dateOfBirth: child.dateOfBirth,
      gender: child.gender,
      medicalNotes: child.medicalNotes || ''
    })
    setShowEditChildModal(true)
  }

  const handleUpdateChild = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingChild) {
      updateChildMutation.mutate({
        id: editingChild.id,
        data: {
          name: editingChild.name,
          dateOfBirth: editingChild.dateOfBirth,
          gender: editingChild.gender,
          medicalNotes: editingChild.medicalNotes || null
        }
      })
    }
  }

  // Update profile state when user data loads
  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        role: currentUser.role || '',
      })
    }
  }, [currentUser])
  
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

  const handleDeleteData = async (type: string) => {
    setDeleteLoading(true)
    try {
      await api.delete(`/data/${type}`)
      queryClient.invalidateQueries()
      setShowDeleteConfirm(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      await api.delete('/auth/account')
      localStorage.removeItem('token')
      window.location.href = '/login'
    } catch (error) {
      console.error('Account deletion failed:', error)
      setDeleteLoading(false)
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'team', label: 'Team', icon: Users },
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

          {activeTab === 'team' && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Team Management</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage team members and their roles
                  </p>
                </div>
                {currentUser?.role === 'PARENT' && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Invite Member</span>
                  </button>
                )}
              </div>

              {teamLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-16 bg-gray-200 rounded"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-gray-600">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-700">Role:</span>
                          {currentUser?.role === 'PARENT' && !member.isOwner ? (
                            <select
                              value={member.role}
                              onChange={(e) =>
                                updateRoleMutation.mutate({
                                  memberId: member.id,
                                  role: e.target.value,
                                })
                              }
                              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                              disabled={updateRoleMutation.isPending}
                            >
                              <option value="PARENT">Parent</option>
                              <option value="NANNY">Nanny</option>
                              <option value="VIEWER">Viewer</option>
                            </select>
                          ) : (
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                member.role === 'PARENT'
                                  ? 'bg-purple-100 text-purple-700'
                                  : member.role === 'NANNY'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {member.role}
                            </span>
                          )}
                        </div>

                        {member.isOwner && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                            Owner
                          </span>
                        )}

                        {currentUser?.role === 'PARENT' &&
                          !member.isOwner &&
                          member.id !== currentUser?.id && (
                            <button
                              onClick={() => setShowDeleteConfirm(`member-${member.id}`)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                    </div>
                  ))}

                  {teamMembers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p>No team members yet</p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Role Permissions</h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li>
                    <strong>Parent:</strong> Full access to all features and settings
                  </li>
                  <li>
                    <strong>Nanny:</strong> Can log activities (feeding, sleep, diapers, health)
                    only
                  </li>
                  <li>
                    <strong>Viewer:</strong> Read-only access to view all data
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'children' && (
            <div className="space-y-6">
              {childrenLoading ? (
                <div className="card">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ) : children.length > 0 ? (
                <>
                  {children.map((child: any, index: number) => (
                    <div key={child.id} className="card">
                      <div className="flex items-start space-x-4">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                          child.gender === 'FEMALE' ? 'bg-pink-100' : 'bg-blue-100'
                        }`}>
                          <span className="text-2xl">
                            {child.gender === 'FEMALE' ? '👧' : '👦'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{child.name}</h3>
                          <p className="text-sm text-gray-600">
                            Born: {new Date(child.dateOfBirth).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Gender: {child.gender === 'FEMALE' ? 'Female' : 'Male'}
                          </p>
                          {child.medicalNotes && (
                            <p className="text-sm text-gray-600 mt-1">
                              Notes: {child.medicalNotes}
                            </p>
                          )}
                          <button
                            onClick={() => handleEditChild(child)}
                            className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                          >
                            Edit Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="card text-center py-8">
                    <button
                      onClick={() => window.location.href = '/onboarding'}
                      className="btn-primary flex items-center space-x-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Another Child</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="card">
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Children Added</h3>
                    <p className="text-gray-600 mb-4">Start by adding your children to track their care.</p>
                    <button
                      onClick={() => window.location.href = '/onboarding'}
                      className="btn-primary"
                    >
                      Add Children
                    </button>
                  </div>
                </div>
              )}
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
            <div className="space-y-6">
              {/* Data Management */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Data Management</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Delete Specific Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Remove specific types of data while keeping your account active
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button
                        onClick={() => setShowDeleteConfirm('feeding')}
                        className="flex items-center justify-center space-x-2 p-4 border-2 border-gray-300 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                        <span>Delete All Feeding Data</span>
                      </button>

                      <button
                        onClick={() => setShowDeleteConfirm('sleep')}
                        className="flex items-center justify-center space-x-2 p-4 border-2 border-gray-300 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                        <span>Delete All Sleep Data</span>
                      </button>

                      <button
                        onClick={() => setShowDeleteConfirm('diaper')}
                        className="flex items-center justify-center space-x-2 p-4 border-2 border-gray-300 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                        <span>Delete All Diaper Data</span>
                      </button>

                      <button
                        onClick={() => setShowDeleteConfirm('health')}
                        className="flex items-center justify-center space-x-2 p-4 border-2 border-gray-300 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-5 h-5 text-red-600" />
                        <span>Delete All Health Data</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <button
                      onClick={() => setShowDeleteConfirm('all')}
                      className="w-full flex items-center justify-center space-x-2 p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>Reset All Data (Keep Account)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Account Security */}
              <div className="card">
                <h2 className="text-lg font-semibold mb-4">Account Security</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Data Encryption</h3>
                    <p className="text-sm text-gray-600">All your data is encrypted at rest and in transit</p>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Change Password</h3>
                    <button className="btn-secondary">Update Password</button>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="card border-red-200 bg-red-50">
                <h2 className="text-lg font-semibold mb-4 text-red-900">Danger Zone</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2 text-red-900">Delete Account</h3>
                    <p className="text-sm text-red-700 mb-4">
                      This will permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button
                      onClick={() => setShowDeleteConfirm('account')}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      <span>Delete Account Permanently</span>
                    </button>
                  </div>
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

      {/* Invite Team Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Invite Team Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={inviteForm.password}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, password: e.target.value })
                  }
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="PARENT">Parent - Full Access</option>
                  <option value="NANNY">Nanny - Logging Only</option>
                  <option value="VIEWER">Viewer - Read Only</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {inviteMutation.isPending ? 'Inviting...' : 'Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Child Modal */}
      {showEditChildModal && editingChild && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Child Profile</h3>
              <button
                onClick={() => {
                  setShowEditChildModal(false)
                  setEditingChild(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateChild} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child's Name
                </label>
                <input
                  type="text"
                  value={editingChild.name}
                  onChange={(e) => setEditingChild({ ...editingChild, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={editingChild.dateOfBirth}
                  onChange={(e) => setEditingChild({ ...editingChild, dateOfBirth: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingChild({ ...editingChild, gender: 'FEMALE' })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      editingChild.gender === 'FEMALE'
                        ? 'border-pink-300 bg-pink-50 text-pink-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <span className="text-2xl mb-1 block">👧</span>
                      <span className="text-sm font-medium">Girl</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingChild({ ...editingChild, gender: 'MALE' })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      editingChild.gender === 'MALE'
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <span className="text-2xl mb-1 block">👦</span>
                      <span className="text-sm font-medium">Boy</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medical Notes (Optional)
                </label>
                <textarea
                  value={editingChild.medicalNotes}
                  onChange={(e) => setEditingChild({ ...editingChild, medicalNotes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Any medical conditions, allergies, or notes..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditChildModal(false)
                    setEditingChild(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateChildMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {updateChildMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Deletion
              </h3>
            </div>

            <p className="text-gray-600 mb-6">
              {showDeleteConfirm === 'account'
                ? 'Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.'
                : showDeleteConfirm === 'all'
                ? 'Are you sure you want to delete all your data? This will remove all feeding, sleep, diaper, and health records but keep your account active.'
                : showDeleteConfirm.startsWith('member-')
                ? 'Are you sure you want to remove this team member? They will lose access to the account.'
                : `Are you sure you want to delete all ${showDeleteConfirm} data? This action cannot be undone.`
              }
            </p>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deleteLoading || removeMemberMutation.isPending}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteConfirm === 'account') {
                    handleDeleteAccount()
                  } else if (showDeleteConfirm.startsWith('member-')) {
                    const memberId = showDeleteConfirm.replace('member-', '')
                    removeMemberMutation.mutate(memberId)
                  } else {
                    handleDeleteData(showDeleteConfirm)
                  }
                }}
                disabled={deleteLoading || removeMemberMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading || removeMemberMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
