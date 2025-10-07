'use client'

import { useState } from 'react'
import { Package, AlertTriangle, ShoppingCart, TrendingDown, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface InventoryItem {
  id: string
  name: string
  category: string
  currentStock: number
  minimumStock: number
  unit: string
  consumptionRate: number
  daysRemaining: number
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([
    {
      id: '1',
      name: 'Diapers Size 1',
      category: 'DIAPERS',
      currentStock: 45,
      minimumStock: 30,
      unit: 'pieces',
      consumptionRate: 12,
      daysRemaining: 3.75,
    },
    {
      id: '2',
      name: 'Formula Powder',
      category: 'FORMULA',
      currentStock: 800,
      minimumStock: 400,
      unit: 'grams',
      consumptionRate: 150,
      daysRemaining: 5.3,
    },
    {
      id: '3',
      name: 'Baby Wipes',
      category: 'WIPES',
      currentStock: 200,
      minimumStock: 100,
      unit: 'sheets',
      consumptionRate: 30,
      daysRemaining: 6.7,
    },
  ])

  const [showAddModal, setShowAddModal] = useState(false)
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'DIAPERS',
    currentStock: 0,
    minimumStock: 0,
    unit: 'pieces',
  })

  const getLowStockItems = () => {
    return items.filter(item => item.daysRemaining <= 3)
  }

  const getConsumptionData = () => {
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
    const item: InventoryItem = {
      id: Date.now().toString(),
      ...newItem,
      consumptionRate: 0,
      daysRemaining: newItem.currentStock / 10, // Rough estimate
    }
    setItems([...items, item])
    setShowAddModal(false)
    setNewItem({
      name: '',
      category: 'DIAPERS',
      currentStock: 0,
      minimumStock: 0,
      unit: 'pieces',
    })
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
          {getLowStockItems().map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
            >
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">{item.name} running low</p>
                  <p className="text-sm text-red-700">
                    Only {item.daysRemaining.toFixed(1)} days remaining
                  </p>
                </div>
              </div>
              <button className="px-3 py-1 bg-red-600 text-white rounded-md text-sm">
                Reorder
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Current Stock */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {items.map((item) => {
          const stockPercentage = (item.currentStock / (item.minimumStock * 2)) * 100
          const isLow = item.currentStock <= item.minimumStock
          
          return (
            <div key={item.id} className="card">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-sm text-gray-600">{item.category}</p>
                </div>
                <Package className={`w-5 h-5 ${isLow ? 'text-red-500' : 'text-green-500'}`} />
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Current Stock</span>
                  <span className="font-medium">
                    {item.currentStock} {item.unit}
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
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">Daily usage</p>
                  <p className="font-medium">{item.consumptionRate} {item.unit}</p>
                </div>
                <div>
                  <p className="text-gray-600">Days left</p>
                  <p className="font-medium">{item.daysRemaining.toFixed(1)}</p>
                </div>
              </div>
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
        <div className="space-y-2">
          {getLowStockItems().map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-600">
                    Need to buy: {item.minimumStock * 2 - item.currentStock} {item.unit}
                  </p>
                </div>
              </div>
              <input type="checkbox" className="w-4 h-4" />
            </div>
          ))}
        </div>
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Inventory Item</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="DIAPERS">Diapers</option>
                  <option value="FORMULA">Formula</option>
                  <option value="WIPES">Wipes</option>
                  <option value="MEDICINE">Medicine</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={newItem.currentStock}
                    onChange={(e) => setNewItem({ ...newItem, currentStock: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
                  <input
                    type="number"
                    value={newItem.minimumStock}
                    onChange={(e) => setNewItem({ ...newItem, minimumStock: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
