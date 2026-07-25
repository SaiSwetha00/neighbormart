import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Save, LogOut } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import Header from '../components/Header'
import { useAuth } from '../stores/auth'
import api from '../api'

export default function ProfilePage() {
  const { user, logout, refetch } = useAuth()
  const navigate = useNavigate()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  })
  const [success, setSuccess] = useState(false)

  const updateMutation = useMutation({
    mutationFn: async () => {
      return api.patch('/customer/profile', form)
    },
    onSuccess: async () => {
      await refetch()
      setEditing(false)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    },
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-3">
            <User size={36} className="text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
          {user?.tier && (
            <span className="inline-block mt-1 text-xs font-semibold px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 capitalize">
              {user.tier} Member
            </span>
          )}
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
            Profile updated successfully.
          </div>
        )}

        <div className="card p-6 mb-4">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-gray-800">Personal Info</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Full Name</label>
              {editing ? (
                <input className="input-field" value={form.name} onChange={set('name')} />
              ) : (
                <p className="text-gray-800 font-medium">{user?.name || '—'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Email</label>
              {editing ? (
                <input type="email" className="input-field" value={form.email} onChange={set('email')} />
              ) : (
                <p className="text-gray-800">{user?.email || '—'}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Phone</label>
              {editing ? (
                <input type="tel" className="input-field" value={form.phone} onChange={set('phone')} placeholder="Not set" />
              ) : (
                <p className="text-gray-800">{user?.phone || <span className="text-gray-400">Not set</span>}</p>
              )}
            </div>
          </div>

          {editing && (
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setEditing(false); setForm({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '' }) }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Save size={16} />
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {user?.loyaltyPoints !== undefined && (
          <div className="card p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Loyalty Points</p>
              <p className="text-2xl font-bold text-green-600">{user.loyaltyPoints}</p>
            </div>
            <a href="/loyalty" className="text-sm text-green-600 hover:text-green-700 font-medium">View History →</a>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-red-500 transition-colors font-medium text-sm"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  )
}
