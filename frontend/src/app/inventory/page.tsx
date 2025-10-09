'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, AlertTriangle, ShoppingCart, Plus, Trash2, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { inventoryAPI } from '@/lib/api'

interface InventoryItem {
  id: string
  userId: string
  category: string
  brand?: string
  itemName: string
  unitSize: string
  currentStock: number
  minimumStock: number
  consumptionRate?: number
  lastRestocked?: string
  nextReorderDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [restockQuantity, setRestockQuantity] = useState(0)
  const [newItem, setNewItem] = useState({
    itemName: '',
    category: 'DIAPERS',
    brand: '',
    unitSize: '',
    currentStock: 0,
    minimumStock: 0,
    consumptionRate: 0,
  })

  // Fetch all inventory items
  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: inventoryAPI.getAll,
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: inventoryAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setShowAddModal(false)
      setNewItem({
        itemName: '',
        category: 'DIAPERS',
        brand: '',
        unitSize: '',
        currentStock: 0,
        minimumStock: 0,
        consumptionRate: 0,
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: inventoryAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  // Restock mutation
  const restockMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      inventoryAPI.restock(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setShowRestockModal(false)
      setSelectedItem(null)
      setRestockQuantity(0)
    },
  })

  const getDaysRemaining = (item: InventoryItem) => {
    if (!item.consumptionRate || item.consumptionRate === 0) return null
    return (item.currentStock - item.minimumStock) / item.consumptionRate
  }

  const getLowStockItems = () => {
    return items.filter((item) => {
      const daysRemaining = getDaysRemaining(item)
      return daysRemaining !== null && daysRemaining <= 3
    })
  }

  const getConsumptionData = () => {
    // Mock data for weekly consumption trends
    // In a real app, this would come from actual usage logs
    return [
      { day: 'Mon', diapers: 12, formula: 140, wipes: 28 },
      { day: 'Tue', diapers: 14, formula: 160, wipes: 35 },
      { day: 'Wed', diapers: 11, formula: 145, wipes: 30 },
      { day: 'Thu', diapers: 13, formula: 155, wipes: 32 },
      { day: 'Fri', diapers: 12, formula: 150, wipes: 28 },
      { day: 'Sat', diapers: 15, formula: 165, wipes: 40 },
      { day: 'Sun', diapers: 14, formula: 160, wipes: 35 },
    ]
  }

  const handleAddItem = () => {
    createMutation.mutate(newItem)
  }

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleRestock = () => {
    if (selectedItem && restockQuantity > 0) {
      restockMutation.mutate({ id: selectedItem.id, quantity: restockQuantity })
    }
  }

  const openRestockModal = (item: InventoryItem) => {
    setSelectedItem(item)
    setRestockQuantity(item.minimumStock * 2 - item.currentStock)
    setShowRestockModal(true)
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Loading inventory...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory & Supplies</h1>
          <p className="text-gray-600 mt-1">Track supplies and get reorder alerts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Low Stock Alerts */}
      {getLowStockItems().length > 0 && (
        <div className="mb-6 space-y-2">
          {getLowStockItems().map((item) => {
            const daysRemaining = getDaysRemaining(item)
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
              >
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">{item.itemName} running low</p>
                    <p className="text-sm text-red-700">
                      Only {daysRemaining?.toFixed(1)} days remaining
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => openRestockModal(item)}
                  className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                >
                  Reorder
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Current Stock */}
      {items.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No inventory items yet</h3>
          <p className="text-gray-600 mb-4">Start tracking your baby supplies</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            Add First Item
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {items.map((item) => {
              const stockPercentage = (item.currentStock / (item.minimumStock * 2)) * 100
              const isLow = item.currentStock <= item.minimumStock
              const daysRemaining = getDaysRemaining(item)

              return (
                <div key={item.id} className="card relative">
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="absolute top-3 right-3 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{item.itemName}</h3>
                      <p className="text-sm text-gray-600">{item.category}</p>
                      {item.brand && (
                        <p className="text-xs text-gray-500">{item.brand}</p>
                      )}
                    </div>
                    <Package className={`w-5 h-5 ${isLow ? 'text-red-500' : 'text-green-500'}`} />
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Current Stock</span>
                      <span className="font-medium">
                        {item.currentStock} {item.unitSize}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          isLow ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-gray-600">Daily usage</p>
                      <p className="font-medium">
                        {item.consumptionRate || '-'} {item.unitSize}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Days left</p>
                      <p className="font-medium">
                        {daysRemaining !== null ? daysRemaining.toFixed(1) : '-'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => openRestockModal(item)}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Restock</span>
                  </button>
                </div>
              )
            })}
          </div>

          {/* Consumption Trends */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold mb-4">Weekly Consumption Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getConsumptionData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="diapers" fill="#3b82f6" name="Diapers" />
                <Bar dataKey="wipes" fill="#10b981" name="Wipes" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Shopping List */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Auto-Generated Shopping List</h2>
            {getLowStockItems().length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                All supplies are well stocked!
              </p>
            ) : (
              <div className="space-y-2">
                {getLowStockItems().map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <ShoppingCart className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium">{item.itemName}</p>
                        <p className="text-sm text-gray-600">
                          Need to buy: {item.minimumStock * 2 - item.currentStock} {item.unitSize}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openRestockModal(item)}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Restock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Inventory Item</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItem.itemName}
                  onChange={(e) => setNewItem({ ...newItem, itemName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="DIAPERS">Diapers</option>
                  <option value="FORMULA">Formula</option>
                  <option value="WIPES">Wipes</option>
                  <option value="MEDICINE">Medicine</option>
                  <option value="FEEDING_SUPPLIES">Feeding Supplies</option>
                  <option value="CLOTHES">Clothes</option>
                  <option value="TOYS">Toys</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                <input
                  type="text"
                  value={newItem.brand}
                  onChange={(e) => setNewItem({ ...newItem, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Size (e.g., "pieces", "ml", "grams")
                </label>
                <input
                  type="text"
                  value={newItem.unitSize}
                  onChange={(e) => setNewItem({ ...newItem, unitSize: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stock *
                  </label>
                  <input
                    type="number"
                    value={newItem.currentStock}
                    onChange={(e) =>
                      setNewItem({ ...newItem, currentStock: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Stock *
                  </label>
                  <input
                    type="number"
                    value={newItem.minimumStock}
                    onChange={(e) =>
                      setNewItem({ ...newItem, minimumStock: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Daily Consumption Rate (optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newItem.consumptionRate}
                  onChange={(e) =>
                    setNewItem({ ...newItem, consumptionRate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={!newItem.itemName || newItem.currentStock < 0 || newItem.minimumStock < 0}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Restock {selectedItem.itemName}</h2>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Current stock: {selectedItem.currentStock} {selectedItem.unitSize}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Minimum stock: {selectedItem.minimumStock} {selectedItem.unitSize}
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity to add
              </label>
              <input
                type="number"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />

              <p className="text-sm text-gray-600 mt-2">
                New stock will be: {selectedItem.currentStock + restockQuantity}{' '}
                {selectedItem.unitSize}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRestockModal(false)
                  setSelectedItem(null)
                  setRestockQuantity(0)
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRestock}
                disabled={restockQuantity <= 0}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Restock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
