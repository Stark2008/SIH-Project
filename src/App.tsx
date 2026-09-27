import React, { useState, useEffect } from 'react'
import {
  BarChart3, Bot, Box, Check, ChevronRight, ClipboardList, Edit2, Factory, Leaf,
  LineChart, LogOut, MapPin, Menu, PackagePlus, Route, ScanLine, ShoppingCart,
  Sprout, Trash2, Truck, Users, X, AlertCircle, ShieldCheck, DollarSign
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { apiFetch, setToken, clearToken, getToken } from './lib/api'

type Role = 'FARMER' | 'FPO' | 'BUYER' | 'ADMIN'
type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'PICKUP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'

const chartData = [
  { day: 'Sep 8', actual: 8.4, forecast: 8.8 },
  { day: 'Sep 9', actual: 9.1, forecast: 9.3 },
  { day: 'Sep 10', actual: 9.4, forecast: 10 },
  { day: 'Sep 11', actual: 10.2, forecast: 10.8 },
  { day: 'Sep 12', actual: 10.6, forecast: 11.4 },
  { day: 'Sep 13', forecast: 11.8 },
  { day: 'Sep 14', forecast: 12.4 }
]

const nav: Record<Role, string[]> = {
  FARMER: ['Dashboard', 'My Produce', 'Market Demand (Matches)', 'Orders & Tracking', 'AI Recommendations', 'Quality Check'],
  FPO: ['Dashboard', 'My Produce', 'Market Demand (Matches)', 'Orders & Tracking', 'AI Forecast', 'Price Intelligence', 'Quality Check'],
  BUYER: ['Dashboard', 'Find Produce', 'Post Requirement', 'Matches', 'Orders & Tracking', 'Price Intelligence'],
  ADMIN: ['Dashboard', 'All Orders', 'Escrow Ledger', 'Demand & Forecast', 'Price Intelligence', 'Quality Check']
}

const icons: Record<string, any> = {
  Dashboard: BarChart3,
  'My Produce': Sprout,
  'Find Produce': ShoppingCart,
  'Post Requirement': PackagePlus,
  Matches: Users,
  'Market Demand (Matches)': Users,
  'Orders & Tracking': ClipboardList,
  'All Orders': ClipboardList,
  'Escrow Ledger': ShieldCheck,
  'AI Recommendations': Bot,
  'AI Forecast': LineChart,
  'Demand & Forecast': LineChart,
  'Quality Check': ScanLine,
  'Price Intelligence': LineChart
}

function Landing({ go }: { go: () => void }) {
  const caps = [
    ['Demand Forecasting', LineChart],
    ['Smart Matching', Users],
    ['Price Intelligence', BarChart3],
    ['Route Optimization', Route],
    ['Quality Assessment', ScanLine],
    ['Simulated Escrow Ledger', ShieldCheck]
  ]

  return (
    <main className="landing">
      <nav className="nav">
        <div className="brand">
          <span className="mark"><Leaf size={19} /></span>
          Farmer Connect
        </div>
        <div className="navlinks">
          <button className="btn" onClick={go}>Sign In / Register</button>
        </div>
      </nav>
      <section className="hero">
        <div>
          <div className="eyebrow">India’s Connected Crop Network</div>
          <h1>From Farm Demand to Smart Delivery.</h1>
          <p>Farmer Connect bridges farmers and FPOs directly with commercial buyers with transparent matching, fair pricing, and secure simulated escrow settlement.</p>
          <div className="actions">
            <button className="btn" onClick={go}>
              Launch Platform <ChevronRight size={16} />
            </button>
            <button className="btn light" onClick={go}>
              Explore Demo Accounts
            </button>
          </div>
        </div>
        <div className="visual">
          <span className="demo">PROTOTYPE & SIMULATION DATA</span>
          <h3>Karnataka → Bengaluru Supply Corridor</h3>
          <div className="flow">
            <div>🌾 Farmer harvests and lists Grade A tomatoes</div>
            <div>🏢 FPO aggregates local supply with automated grading</div>
            <div>✦ AI predicts market demand & matches verified buyers</div>
            <div>🛡️ Simulated escrow locks funds until verified delivery</div>
          </div>
        </div>
      </section>
      <div className="metric-row">
        {[
          ['18%', 'better farmer realization'],
          ['23%', 'lower logistics distance'],
          ['15%', 'reduction in post-harvest wastage'],
          ['100%', 'simulated ledger auditability']
        ].map(([a, b]) => (
          <div className="metric" key={b}>
            <b>{a}</b>
            <span className="muted">{b}<br />Simulation metric</span>
          </div>
        ))}
      </div>
      <section className="section">
        <div className="eyebrow">End-to-End Coordination</div>
        <h2>Direct trading without middlemen opacity.</h2>
        <p className="muted">Empowering every participant in the agricultural supply chain.</p>
        <div className="capabilities">
          {caps.map(([title, Icon]: any) => (
            <div className="cap" key={title}>
              <Icon size={24} />
              <h3>{title}</h3>
              <span className="muted">Data-guided, reliable trade coordination from harvest to market.</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

function Auth({ enter }: { enter: (u: any) => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('password123')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'FARMER' | 'BUYER' | 'FPO'>('FARMER')
  const [location, setLocation] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      const res = await apiFetch('/auth/login', { method: 'POST', data: { email, password } })
      setToken(res.data.token)
      enter(res.data.user)
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        data: { email, password, name, role, location: location || 'India' }
      })
      setSuccessMsg('Account created successfully! Signing in...')
      // Auto login
      const res = await apiFetch('/auth/login', { method: 'POST', data: { email, password } })
      setToken(res.data.token)
      enter(res.data.user)
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const autofill = (em: string) => {
    setEmail(em)
    setPassword('password123')
    setError('')
  }

  return (
    <main className="login">
      <div className="loginbox">
        <div className="brand" style={{ marginBottom: 16 }}>
          <span className="mark"><Leaf size={19} /></span>
          Farmer Connect
        </div>

        <div className="tab-group">
          <button
            type="button"
            className={`tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); setSuccessMsg(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); setSuccessMsg(''); }}
          >
            Create Account
          </button>
        </div>

        {tab === 'login' ? (
          <>
            <p className="muted" style={{ marginBottom: 14 }}>
              Sign in to your account or click a quick-demo account below:
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              <button type="button" className="btn light" onClick={() => autofill('farmer@demo.com')} style={{ fontSize: 12 }}>
                🌾 Demo Farmer
              </button>
              <button type="button" className="btn light" onClick={() => autofill('buyer@demo.com')} style={{ fontSize: 12 }}>
                🛒 Demo Buyer
              </button>
              <button type="button" className="btn light" onClick={() => autofill('admin@demo.com')} style={{ fontSize: 12 }}>
                🛡️ Demo Admin
              </button>
              <button type="button" className="btn light" onClick={() => autofill('fpo@demo.com')} style={{ fontSize: 12 }}>
                🏢 Demo FPO
              </button>
            </div>

            <form onSubmit={handleLogin}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <div className="alert-box error">{error}</div>}
              {successMsg && <div className="alert-box success">{successMsg}</div>}
              <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="muted" style={{ marginBottom: 14 }}>
              Register a new account on Farmer Connect:
            </p>
            <form onSubmit={handleRegister}>
              <div className="formgrid">
                <div className="field">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    required
                  />
                </div>
                <div className="field">
                  <label>Account Role</label>
                  <select value={role} onChange={e => setRole(e.target.value as any)}>
                    <option value="FARMER">Farmer (Producer)</option>
                    <option value="BUYER">Buyer (Commercial)</option>
                    <option value="FPO">FPO (Aggregator)</option>
                  </select>
                </div>
                <div className="field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    required
                  />
                </div>
                <div className="field">
                  <label>Location / District</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Kolar, Karnataka"
                    required
                  />
                </div>
              </div>
              <div className="field" style={{ marginTop: 12, marginBottom: 14 }}>
                <label>Password (min 8 characters)</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  minLength={8}
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <div className="alert-box error">{error}</div>}
              {successMsg && <div className="alert-box success">{successMsg}</div>}
              <button className="btn" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
                {loading ? 'Creating Account...' : 'Register Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}

function KPI({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="card">
      <span className="muted">{label}</span>
      <div className="stat">{value}</div>
      <span className="trend">↗ {trend}</span>
    </div>
  )
}

function Chart({ price = false }: { price?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#278657" stopOpacity=".3" />
            <stop offset="1" stopColor="#278657" stopOpacity="0" />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#edf0ed" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Area type="monotone" dataKey={price ? 'forecast' : 'actual'} stroke="#278657" fill="url(#fill)" strokeWidth={3} />
        <Area type="monotone" dataKey="forecast" stroke="#d59928" fill="none" strokeDasharray="5 5" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function DashboardApp({
  user,
  page,
  setPage,
  logout
}: {
  user: any
  page: string
  setPage: (s: string) => void
  logout: () => void
}) {
  const role: Role = user.role
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const title = page === 'Dashboard' ? `${role} Dashboard` : page

  // Global UI State
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Data States
  const [myProduce, setMyProduce] = useState<any[]>([])
  const [allProduce, setAllProduce] = useState<any[]>([])
  const [myReqs, setMyReqs] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [escrowEntries, setEscrowEntries] = useState<any[]>([])
  const [orderEvents, setOrderEvents] = useState<Record<string, any[]>>({})

  // Modals & Action States
  const [editingProduce, setEditingProduce] = useState<any | null>(null)
  const [buyingProduce, setBuyingProduce] = useState<any | null>(null)
  const [buyQuantity, setBuyQuantity] = useState<number>(10)
  const [searchCrop, setSearchCrop] = useState('')
  const [gradeFilter, setGradeFilter] = useState('ALL')

  // Fetch Helpers
  const fetchProduceMine = async () => {
    try {
      const res = await apiFetch('/produce/mine')
      setMyProduce(res.data.produce || [])
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  const fetchProduceAll = async () => {
    try {
      const res = await apiFetch('/produce')
      setAllProduce(res.data.produce || [])
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  const fetchReqsMine = async () => {
    try {
      const res = await apiFetch('/requirements/mine')
      setMyReqs(res.data.requirements || [])
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  const fetchMatches = async () => {
    try {
      const res = await apiFetch('/matches')
      setMatches(res.data.matches || [])
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  const fetchOrders = async () => {
    try {
      const endpoint = role === 'ADMIN' ? '/orders' : '/orders/mine'
      const res = await apiFetch(endpoint)
      const list = res.data.orders || []
      setOrders(list)
      // Fetch timeline events for active orders
      for (const order of list.slice(0, 10)) {
        apiFetch(`/orders/${order.id}/events`)
          .then(evRes => {
            setOrderEvents(prev => ({ ...prev, [order.id]: evRes.data.events || [] }))
          })
          .catch(() => {})
      }
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  const fetchEscrowLedger = async () => {
    try {
      const res = await apiFetch('/escrow')
      setEscrowEntries(res.data.escrowEntries || [])
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  // Load relevant data on tab change and on Dashboard mount
  useEffect(() => {
    setErrorMsg('')
    setSuccessMsg('')

    if (role === 'FARMER' || role === 'FPO') {
      fetchProduceMine()
      fetchOrders()
      fetchMatches()
    } else if (role === 'BUYER') {
      fetchProduceAll()
      fetchReqsMine()
      fetchOrders()
      fetchMatches()
    } else if (role === 'ADMIN') {
      fetchOrders()
      fetchEscrowLedger()
      fetchProduceAll()
    }
  }, [page, role])

  // Handlers
  const handleProduceSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    const fd = new FormData(e.currentTarget)
    const body = {
      crop: fd.get('crop'),
      quantity: Number(fd.get('qty')),
      harvestDate: fd.get('harvest'),
      location: fd.get('loc'),
      qualityGrade: fd.get('qual'),
      expectedPrice: Number(fd.get('price'))
    }
    try {
      setLoading(true)
      await apiFetch('/produce', { method: 'POST', data: body })
      e.currentTarget.reset()
      setSuccessMsg('Produce listing added successfully!')
      fetchProduceMine()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProduce = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduce) return
    setErrorMsg('')
    setSuccessMsg('')
    try {
      setLoading(true)
      await apiFetch(`/produce/${editingProduce.id}`, {
        method: 'PATCH',
        data: {
          quantity: Number(editingProduce.quantity),
          expectedPrice: Number(editingProduce.expectedPrice),
          status: editingProduce.status
        }
      })
      setSuccessMsg('Produce updated successfully!')
      setEditingProduce(null)
      fetchProduceMine()
      fetchMatches()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduce = async (produceId: string) => {
    if (!confirm('Are you sure you want to delete this produce listing?')) return
    setErrorMsg('')
    setSuccessMsg('')
    try {
      setLoading(true)
      await apiFetch(`/produce/${produceId}`, { method: 'DELETE' })
      setSuccessMsg('Produce listing deleted.')
      fetchProduceMine()
      fetchMatches()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReqSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    const fd = new FormData(e.currentTarget)
    const body = {
      crop: fd.get('crop'),
      quantity: Number(fd.get('qty')),
      qualityGrade: fd.get('qual'),
      deliveryLocation: fd.get('deliv')
    }
    try {
      setLoading(true)
      await apiFetch('/requirements', { method: 'POST', data: body })
      e.currentTarget.reset()
      setSuccessMsg('Requirement posted! Searching for matching produce...')
      fetchReqsMine()
      fetchMatches()
      setPage('Matches')
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceOrder = async (produceId: string, requirementId: string | null, quantity: number) => {
    setErrorMsg('')
    setSuccessMsg('')
    try {
      setLoading(true)
      await apiFetch('/orders', {
        method: 'POST',
        data: {
          produceId,
          requirementId: requirementId || undefined,
          quantity
        }
      })
      setSuccessMsg(`Order placed successfully for ${quantity} kg!`)
      setBuyingProduce(null)
      fetchOrders()
      fetchProduceAll()
      fetchMatches()
      setPage('Orders & Tracking')
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdvanceStatus = async (orderId: string, currentStatus: string) => {
    setErrorMsg('')
    setSuccessMsg('')
    const nextStatus: Record<string, string> = {
      PENDING: 'CONFIRMED',
      CONFIRMED: 'PROCESSING',
      PROCESSING: 'PICKUP',
      PICKUP: 'IN_TRANSIT',
      IN_TRANSIT: 'DELIVERED'
    }
    const status = nextStatus[currentStatus]
    if (!status) return
    try {
      setLoading(true)
      await apiFetch(`/orders/${orderId}/status`, { method: 'PATCH', data: { status } })
      setSuccessMsg(`Order advanced to ${status}`)
      fetchOrders()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order? Any locked escrow will be refunded.')) return
    setErrorMsg('')
    setSuccessMsg('')
    try {
      setLoading(true)
      await apiFetch(`/orders/${orderId}/status`, { method: 'PATCH', data: { status: 'CANCELLED' } })
      setSuccessMsg('Order cancelled and inventory restocked.')
      fetchOrders()
      if (role === 'ADMIN') fetchEscrowLedger()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAdminRelease = async (paymentId: string) => {
    setErrorMsg('')
    setSuccessMsg('')
    try {
      setLoading(true)
      const idempotencyKey = `admin-release-${paymentId}-${Date.now()}`
      await apiFetch('/escrow/release', {
        method: 'POST',
        data: { paymentId, idempotencyKey }
      })
      setSuccessMsg('Escrow funds released to supplier!')
      fetchOrders()
      fetchEscrowLedger()
    } catch (e: any) {
      setErrorMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Components: Payment & Escrow Sub-Widgets
  const PaymentWidget = ({ order }: { order: any }) => {
    const [payment, setPayment] = useState<any>(null)
    const [pmtLoading, setPmtLoading] = useState(false)
    const [pmtError, setPmtError] = useState('')

    const refreshPayment = () => {
      apiFetch(`/orders/${order.id}/payment`)
        .then(res => setPayment(res.data.payment))
        .catch(() => setPayment(null))
    }

    useEffect(() => {
      refreshPayment()
    }, [order.id])

    const handleInitPayment = async () => {
      try {
        setPmtLoading(true)
        setPmtError('')
        const idempotencyKey = `pmt_${order.id}_${Date.now()}`
        const res = await apiFetch('/payments', {
          method: 'POST',
          data: { orderId: order.id, idempotencyKey }
        })
        setPayment(res.data.payment)
      } catch (e: any) {
        setPmtError(e.message)
      } finally {
        setPmtLoading(false)
      }
    }

    const handleSimulatePayment = async (success: boolean) => {
      if (!payment) return
      try {
        setPmtLoading(true)
        setPmtError('')
        const res = await apiFetch(`/payments/${payment.id}/simulate`, {
          method: 'POST',
          data: { success }
        })
        setPayment(res.data.payment)
      } catch (e: any) {
        setPmtError(e.message)
      } finally {
        setPmtLoading(false)
      }
    }

    return (
      <div style={{ marginTop: 15, padding: 15, border: '1px dashed #cfd8d2', borderRadius: 8, background: '#fbfcfb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="eyebrow" style={{ fontSize: 11 }}>Simulated Payment Gateway</span>
            <h5 style={{ margin: '4px 0', fontSize: 14 }}>
              Order Settlement: ₹{((order.agreedPrice * order.agreedQuantity)).toLocaleString()}
            </h5>
          </div>
          {payment && (
            <span className={`badge ${payment.status === 'CAPTURED' ? 'green' : payment.status === 'FAILED' ? 'red' : 'orange'}`}>
              Payment: {payment.status}
            </span>
          )}
        </div>

        {pmtError && <div className="alert-box error" style={{ marginTop: 8, padding: '6px 10px' }}>{pmtError}</div>}

        {!payment ? (
          <div style={{ marginTop: 8 }}>
            <p className="muted" style={{ fontSize: 13, margin: '4px 0 8px' }}>
              No payment initiated yet for this order.
            </p>
            {role === 'BUYER' && order.status !== 'CANCELLED' && (
              <button
                className="btn"
                style={{ fontSize: 12, padding: '5px 12px' }}
                onClick={handleInitPayment}
                disabled={pmtLoading}
              >
                {pmtLoading ? 'Initializing...' : 'Initialize Payment Intent'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span>Transaction Ref: <code style={{ fontSize: 11 }}>{payment.providerTxId || payment.id.substring(0, 10)}</code></span>
              <span>Amount in Paise: {payment.amount}</span>
            </div>

            {payment.status === 'PENDING' && role === 'BUYER' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  className="btn"
                  style={{ fontSize: 12, padding: '5px 12px' }}
                  onClick={() => handleSimulatePayment(true)}
                  disabled={pmtLoading}
                >
                  Simulate Bank Success
                </button>
                <button
                  className="btn light"
                  style={{ fontSize: 12, padding: '5px 12px', color: '#ba3d2d', borderColor: '#ba3d2d' }}
                  onClick={() => handleSimulatePayment(false)}
                  disabled={pmtLoading}
                >
                  Simulate Bank Failure
                </button>
              </div>
            )}

            <EscrowWidget order={order} payment={payment} />
          </div>
        )}
      </div>
    )
  }

  const EscrowWidget = ({ order, payment }: { order: any; payment: any }) => {
    const [escrow, setEscrow] = useState<any>(null)
    const [escLoading, setEscLoading] = useState(false)
    const [escError, setEscError] = useState('')

    const refreshEscrow = () => {
      apiFetch(`/orders/${order.id}/escrow`)
        .then(res => setEscrow(res.data.escrowEntries?.[0] || null))
        .catch(() => setEscrow(null))
    }

    useEffect(() => {
      refreshEscrow()
    }, [order.id])

    const handleLockEscrow = async () => {
      try {
        setEscLoading(true)
        setEscError('')
        const idempotencyKey = `esc_lock_${payment.id}_${Date.now()}`
        const res = await apiFetch('/escrow/lock', {
          method: 'POST',
          data: { paymentId: payment.id, idempotencyKey }
        })
        setEscrow(res.data.escrowEntry)
        setSuccessMsg('Simulated funds locked safely in escrow ledger!')
      } catch (e: any) {
        setEscError(e.message)
      } finally {
        setEscLoading(false)
      }
    }

    if (!payment || payment.status !== 'CAPTURED') return null

    const isDelivered = order.status === 'DELIVERED'
    const isLocked = escrow?.entryType === 'ESCROW_LOCKED'
    const isReleased = escrow?.entryType === 'ESCROW_RELEASED'
    const isCancelled = escrow?.entryType === 'ESCROW_CANCELLED'

    return (
      <div style={{ marginTop: 12, padding: 12, border: '1px solid #d8e5dc', borderRadius: 8, background: '#f5faf6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="eyebrow" style={{ fontSize: 11 }}>Internal Escrow Ledger (Simulation)</span>
          {escrow && (
            <span className={`badge ${isReleased ? 'green' : isCancelled ? 'red' : 'blue'}`}>
              Ledger: {escrow.entryType}
            </span>
          )}
        </div>

        {escError && <div className="alert-box error" style={{ marginTop: 8, padding: '6px 10px' }}>{escError}</div>}

        {!escrow ? (
          <div style={{ marginTop: 6 }}>
            <p className="muted" style={{ fontSize: 12, margin: '4px 0 8px' }}>
              Payment is captured. Buyer can now lock the funds in the escrow ledger.
            </p>
            {role === 'BUYER' && order.status !== 'CANCELLED' && (
              <button
                className="btn"
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={handleLockEscrow}
                disabled={escLoading}
              >
                {escLoading ? 'Locking...' : 'Lock Funds in Escrow'}
              </button>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 6, fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Secured Amount: <b>₹{(escrow.amount / 100).toFixed(2)}</b> ({escrow.direction})</span>
              {isLocked && isDelivered && (
                <span className="badge orange">ELIGIBLE FOR RELEASE</span>
              )}
            </div>

            {/* Admin direct release button */}
            {role === 'ADMIN' && isLocked && isDelivered && (
              <div style={{ marginTop: 8 }}>
                <button
                  className="btn"
                  style={{ fontSize: 12, padding: '5px 12px' }}
                  onClick={() => handleAdminRelease(payment.id)}
                  disabled={loading}
                >
                  Release Escrow to Supplier
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Page 1: Dashboard Home
  const dashStats = (
    <>
      <div className="cards">
        {role === 'FARMER' || role === 'FPO' ? (
          <>
            <KPI label="Active Produce Listings" value={myProduce.length.toString()} trend="Active" />
            <KPI label="Total Orders" value={orders.length.toString()} trend="Orders" />
            <KPI
              label="Inventory Listed"
              value={`${myProduce.reduce((acc, p) => acc + (p.quantity || 0), 0)} kg`}
              trend="Current Stock"
            />
            <KPI label="Demand Matches" value={matches.length.toString()} trend="Live Demand" />
          </>
        ) : role === 'BUYER' ? (
          <>
            <KPI label="Active Requirements" value={myReqs.length.toString()} trend="Posted" />
            <KPI label="Matches Found" value={matches.length.toString()} trend="Available" />
            <KPI label="My Orders" value={orders.length.toString()} trend="In Progress" />
            <KPI label="Marketplace Produce" value={allProduce.length.toString()} trend="Live Listings" />
          </>
        ) : (
          <>
            <KPI label="Total Platform Orders" value={orders.length.toString()} trend="All Time" />
            <KPI label="Escrow Ledger Entries" value={escrowEntries.length.toString()} trend="Auditable" />
            <KPI label="Active Listings" value={allProduce.length.toString()} trend="Suppliers" />
            <KPI
              label="Escrow Secured Value"
              value={`₹${(escrowEntries.reduce((acc, e) => acc + (e.amount || 0), 0) / 100).toLocaleString()}`}
              trend="Simulated"
            />
          </>
        )}
      </div>

      <div className="grid2" style={{ marginTop: 18 }}>
        <section className="card ai">
          <div className="ai-content">
            <div>
              <span className="eyebrow" style={{ color: '#b8e9c3' }}>✦ AI Supply Intelligence (Simulation)</span>
              <h2>Data-Driven Agricultural Forecasting</h2>
              <p className="muted">
                Demand forecasting, price intelligence, and computer vision quality grading are simulated to demonstrate complete supply chain decision automation.
              </p>
            </div>
          </div>
        </section>
        <section className="card">
          <h3>Market Demand Trend · Prototype</h3>
          <div className="chart">
            <Chart />
          </div>
        </section>
      </div>
    </>
  )

  // Page 2: My Produce (Farmer / FPO)
  const producePage = (
    <section className="grid2">
      <div className="card">
        <h3>Add Produce Listing</h3>
        <p className="muted">Publish crop availability for verified buyers and FPOs.</p>
        <form onSubmit={handleProduceSubmit}>
          <div className="formgrid">
            <div className="field">
              <label>Crop Name</label>
              <select name="crop">
                <option value="Tomato">Tomato</option>
                <option value="Onion">Onion</option>
                <option value="Potato">Potato</option>
                <option value="Carrot">Carrot</option>
                <option value="Cabbage">Cabbage</option>
              </select>
            </div>
            <div className="field">
              <label>Quantity (kg)</label>
              <input name="qty" type="number" min="1" defaultValue="500" required />
            </div>
            <div className="field">
              <label>Expected Harvest Date</label>
              <input name="harvest" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
            </div>
            <div className="field">
              <label>Farming Location</label>
              <input name="loc" type="text" defaultValue={user.location || 'Karnataka'} required />
            </div>
            <div className="field">
              <label>Quality Grade</label>
              <select name="qual">
                <option value="Grade A">Grade A (Premium)</option>
                <option value="Grade B">Grade B (Standard)</option>
              </select>
            </div>
            <div className="field">
              <label>Expected Price (₹/kg)</label>
              <input name="price" type="number" min="1" defaultValue="30" required />
            </div>
          </div>
          <button className="btn" style={{ marginTop: 16 }} type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'List Produce'}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>My Produce Listings</h3>
          <span className="muted">{myProduce.length} active listings</span>
        </div>

        {myProduce.length === 0 ? (
          <p className="muted" style={{ marginTop: 20 }}>No produce listings yet. Use the form to list your harvest.</p>
        ) : (
          <div className="tablewrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Quantity</th>
                  <th>Grade</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myProduce.map(p => (
                  <tr key={p.id}>
                    <td><b>{p.crop}</b><br /><span className="muted">{p.location}</span></td>
                    <td>{p.quantity} kg</td>
                    <td>{p.qualityGrade}</td>
                    <td>₹{p.expectedPrice}/kg</td>
                    <td>
                      <span className={`badge ${p.status === 'AVAILABLE' ? 'green' : p.status === 'SOLD' ? 'red' : 'orange'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="btn light"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                          onClick={() => setEditingProduce(p)}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn light"
                          style={{ padding: '4px 8px', fontSize: 11, color: '#ba3d2d', borderColor: '#ffccc7' }}
                          onClick={() => handleDeleteProduce(p.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )

  // Page 3: Find Produce (Buyer Marketplace)
  const filteredMarketProduce = allProduce.filter(p => {
    const matchCrop = !searchCrop || p.crop.toLowerCase().includes(searchCrop.toLowerCase())
    const matchGrade = gradeFilter === 'ALL' || p.qualityGrade === gradeFilter
    return matchCrop && matchGrade && p.status === 'AVAILABLE' && p.quantity > 0
  })

  const findProducePage = (
    <section>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3>Available Farm Produce</h3>
            <p className="muted">Direct from local farmers and FPOs with live inventory verification.</p>
          </div>
          <div className="filter-bar">
            <input
              type="text"
              placeholder="Search crop (e.g. Tomato)..."
              value={searchCrop}
              onChange={e => setSearchCrop(e.target.value)}
            />
            <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
              <option value="ALL">All Grades</option>
              <option value="Grade A">Grade A</option>
              <option value="Grade B">Grade B</option>
            </select>
          </div>
        </div>

        {filteredMarketProduce.length === 0 ? (
          <p className="muted" style={{ padding: '30px 0', textAlign: 'center' }}>
            No produce matching your criteria is currently available.
          </p>
        ) : (
          <div className="produce-grid">
            {filteredMarketProduce.map(p => (
              <div key={p.id} className="produce-card">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: 18 }}>{p.crop}</h4>
                    <span className="badge green">{p.qualityGrade}</span>
                  </div>
                  <p className="muted" style={{ margin: '6px 0 12px', fontSize: 13 }}>
                    <MapPin size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {p.location} · Supplier: {p.supplier?.name || 'Farmer'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, margin: '8px 0' }}>
                    <span>Available: <b>{p.quantity} kg</b></span>
                    <span style={{ color: '#176b42', fontWeight: 700 }}>₹{p.expectedPrice}/kg</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: 14, width: '100%' }}
                  onClick={() => {
                    setBuyingProduce(p)
                    setBuyQuantity(Math.min(100, p.quantity))
                  }}
                >
                  Order Produce
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )

  // Page 4: Matches (for Buyers & Farmers)
  const matchesPage = (
    <section className="grid2">
      <div className="card">
        <h3>{role === 'BUYER' ? 'Smart Requirement Matches' : 'Market Demand for Your Crops'}</h3>
        <p className="muted">
          {role === 'BUYER'
            ? 'Produce listings algorithmically matching your open procurement requirements.'
            : 'Open commercial buyer requirements matched against your available crops.'}
        </p>

        {matches.length === 0 ? (
          <p className="muted" style={{ padding: '20px 0' }}>
            {role === 'BUYER'
              ? 'No open requirements or matching produce found. Post a requirement to trigger matching!'
              : 'No open buyer demand found matching your listed crops.'}
          </p>
        ) : (
          matches.map((m, idx) => (
            <div key={idx} style={{ border: '1px solid #eef0ed', padding: 15, borderRadius: 8, marginBottom: 15 }}>
              <span className="eyebrow">
                {role === 'BUYER'
                  ? `Requirement: ${m.crop} (${m.requestedQuantity} kg)`
                  : `Your Produce: ${m.crop} (${m.availableQuantity} kg available · ₹${m.price}/kg)`}
              </span>

              {role === 'BUYER' ? (
                m.matchedProduce && m.matchedProduce.length > 0 ? (
                  m.matchedProduce.map((p: any) => (
                    <div
                      key={p.produceId}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, padding: 10, background: '#f8f9f8', borderRadius: 6 }}
                    >
                      <div>
                        <b>{p.supplierName}</b> ({p.location})<br />
                        <span className="muted">{p.availableQuantity} kg available · ₹{p.price}/kg</span>
                      </div>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 12, padding: '6px 12px' }}
                        onClick={() => handlePlaceOrder(p.produceId, m.requirementId, Math.min(m.requestedQuantity, p.availableQuantity))}
                        disabled={loading}
                      >
                        Purchase Match
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ marginTop: 8 }}>No suppliers currently matching this crop specification.</p>
                )
              ) : (
                m.matchedRequirements && m.matchedRequirements.length > 0 ? (
                  m.matchedRequirements.map((r: any) => (
                    <div
                      key={r.requirementId}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, padding: 10, background: '#f8f9f8', borderRadius: 6 }}
                    >
                      <div>
                        <b>Buyer: {r.buyerName}</b><br />
                        <span className="muted">Demands: {r.requestedQuantity} kg to {r.deliveryLocation}</span>
                      </div>
                      <span className="badge green">Match Confirmed</span>
                    </div>
                  ))
                ) : (
                  <p className="muted" style={{ marginTop: 8 }}>No active buyer requirements found for this produce.</p>
                )
              )}
            </div>
          ))
        )}
      </div>

      {role === 'BUYER' && (
        <div className="card">
          <h3>Post New Requirement</h3>
          <p className="muted">Specify crops, quantity, and delivery destination.</p>
          <form onSubmit={handleReqSubmit}>
            <div className="formgrid">
              <div className="field">
                <label>Crop</label>
                <select name="crop">
                  <option value="Tomato">Tomato</option>
                  <option value="Onion">Onion</option>
                  <option value="Potato">Potato</option>
                  <option value="Carrot">Carrot</option>
                  <option value="Cabbage">Cabbage</option>
                </select>
              </div>
              <div className="field">
                <label>Quantity (kg)</label>
                <input name="qty" type="number" min="1" defaultValue="500" required />
              </div>
              <div className="field">
                <label>Quality Grade</label>
                <select name="qual">
                  <option value="Grade A">Grade A</option>
                  <option value="Grade B">Grade B</option>
                </select>
              </div>
              <div className="field">
                <label>Delivery Location</label>
                <input name="deliv" defaultValue="Bengaluru Central Market" required />
              </div>
            </div>
            <button className="btn" type="submit" style={{ marginTop: 16 }} disabled={loading}>
              {loading ? 'Posting...' : 'Post Requirement'}
            </button>
          </form>

          {myReqs.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4>My Active Requirements</h4>
              <table className="table" style={{ marginTop: 8 }}>
                <thead>
                  <tr>
                    <th>Crop</th>
                    <th>Quantity</th>
                    <th>Grade</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myReqs.map(r => (
                    <tr key={r.id}>
                      <td>{r.crop}</td>
                      <td>{r.quantity} kg</td>
                      <td>{r.qualityGrade}</td>
                      <td><span className="badge green">{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )

  // Page 5: Orders & Tracking
  const tracePage = (
    <section>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Orders & Supply Traceability</h3>
            <p className="muted">Real-time status progression, payment simulation, and escrow tracking.</p>
          </div>
          <span className="muted">{orders.length} total orders</span>
        </div>

        {orders.length === 0 ? (
          <p className="muted" style={{ padding: '30px 0', textAlign: 'center' }}>
            No orders found.
          </p>
        ) : (
          orders.map(o => (
            <div key={o.id} style={{ borderBottom: '1px solid #eee', paddingBottom: 22, marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <span className="eyebrow">Order #{o.id.substring(0, 8)}</span>
                  <h4 style={{ margin: '4px 0', fontSize: 18 }}>
                    {o.produce?.crop || 'Produce'} · {o.agreedQuantity} kg @ ₹{o.agreedPrice}/kg
                  </h4>
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    Buyer: <b>{o.buyer?.name || 'Buyer'}</b> | Supplier: <b>{o.supplier?.name || 'Supplier'}</b>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${o.status === 'DELIVERED' ? 'green' : o.status === 'CANCELLED' ? 'red' : 'orange'}`}>
                    {o.status}
                  </span>

                  {/* Farmer / Supplier controls */}
                  {(role === 'FARMER' || role === 'FPO' || role === 'ADMIN') &&
                    o.status !== 'DELIVERED' &&
                    o.status !== 'CANCELLED' && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ fontSize: 12, padding: '4px 10px' }}
                          onClick={() => handleAdvanceStatus(o.id, o.status)}
                          disabled={loading}
                        >
                          Advance Fulfillment Step
                        </button>
                      </div>
                    )}

                  {/* Buyer controls */}
                  {role === 'BUYER' && o.status === 'IN_TRANSIT' && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ fontSize: 12, padding: '4px 10px', background: '#247648' }}
                        onClick={() => handleAdvanceStatus(o.id, 'IN_TRANSIT')}
                        disabled={loading}
                      >
                        Confirm Receipt (Delivered)
                      </button>
                    </div>
                  )}

                  {/* Cancel button if pending or confirmed */}
                  {(o.status === 'PENDING' || o.status === 'CONFIRMED') && (
                    <div style={{ marginTop: 6 }}>
                      <button
                        type="button"
                        className="btn light"
                        style={{ fontSize: 11, padding: '3px 8px', color: '#ba3d2d', borderColor: '#ffccc7' }}
                        onClick={() => handleCancelOrder(o.id)}
                        disabled={loading}
                      >
                        Cancel Order
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment and Escrow sub-widget */}
              <PaymentWidget order={o} />

              {/* Traceability events */}
              {orderEvents[o.id] && orderEvents[o.id].length > 0 && (
                <div style={{ marginTop: 12, padding: '12px', background: '#f8faf8', borderRadius: 6 }}>
                  <b style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#68786e' }}>
                    Audit Timeline Events
                  </b>
                  {orderEvents[o.id].map((ev, i) => (
                    <div key={ev.id} style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 12 }}>
                      <span className="badge">{i + 1}</span>
                      <span>
                        <b>{ev.status}</b>: {ev.description}
                        <span className="muted" style={{ marginLeft: 6 }}>
                          ({new Date(ev.createdAt).toLocaleTimeString()})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  )

  // Page 6: Escrow Ledger (Admin Audit View)
  const escrowLedgerPage = (
    <section>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Simulated Escrow Ledger Audit Trail</h3>
            <p className="muted">Cryptographically verified, double-entry style immutable internal accounting ledger.</p>
          </div>
          <span className="badge green">{escrowEntries.length} Ledger Records</span>
        </div>

        {escrowEntries.length === 0 ? (
          <p className="muted" style={{ padding: '24px 0', textAlign: 'center' }}>No ledger entries found.</p>
        ) : (
          <div className="tablewrap" style={{ marginTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Entry Type</th>
                  <th>Direction</th>
                  <th>Amount</th>
                  <th>Order</th>
                  <th>Buyer</th>
                  <th>Supplier</th>
                  <th>Idempotency Key</th>
                  <th>Recorded At</th>
                </tr>
              </thead>
              <tbody>
                {escrowEntries.map(e => (
                  <tr key={e.id}>
                    <td>
                      <span className={`badge ${e.entryType === 'ESCROW_RELEASED' ? 'green' : e.entryType === 'ESCROW_CANCELLED' ? 'red' : 'blue'}`}>
                        {e.entryType}
                      </span>
                    </td>
                    <td><b>{e.direction}</b></td>
                    <td>₹{(e.amount / 100).toFixed(2)}</td>
                    <td>#{e.orderId.substring(0, 8)} ({e.order?.produce?.crop || 'Crop'})</td>
                    <td>{e.buyer?.name}</td>
                    <td>{e.supplier?.name}</td>
                    <td><code style={{ fontSize: 11 }}>{e.idempotencyKey.substring(0, 16)}...</code></td>
                    <td className="muted">{new Date(e.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )

  // Prototype Pages (AI)
  const forecastPage = (
    <section className="grid2">
      <div className="card">
        <div className="topbar">
          <div>
            <h3>AI Demand Forecast</h3>
            <p className="muted">Historical consumption → forward demand simulation</p>
          </div>
        </div>
        <div className="chart">
          <Chart />
        </div>
      </div>
      <div className="card">
        <h3>Forecast Factors & Weights</h3>
        {[
          ['Regional Seasonality', 'High Impact'],
          ['Mandi Price Historical Trend', 'High Impact'],
          ['Aggregated Current Supply', 'Medium Impact'],
          ['Weather & Rainfall Outlook', 'Medium Impact'],
          ['Festival & Event Surge', 'Low Impact']
        ].map(x => (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #eef0ed' }} key={x[0]}>
            <span>{x[0]}</span>
            <span className="badge">{x[1]}</span>
          </div>
        ))}
        <p className="muted" style={{ marginTop: 12 }}>Prototype statistical model with simulated inputs.</p>
      </div>
    </section>
  )

  const pricePage = (
    <section className="grid2">
      <div className="card">
        <h3>AI Price Intelligence & Arbitrage</h3>
        <div className="chart">
          <Chart price />
        </div>
      </div>
      <div className="card ai">
        <span className="eyebrow" style={{ color: '#b8e9c3' }}>Price Recommendation</span>
        <h2 style={{ fontFamily: 'Fraunces' }}>RECOMMENDATION: HOLD</h2>
        <p>Current price: ₹28/kg → Projected price: ₹31/kg in 5 days</p>
        <p className="muted">
          Expected price appreciation exceeds cold storage depreciation rate by approximately 7.4%.
        </p>
      </div>
    </section>
  )

  const [qaFileSelected, setQaFileSelected] = useState(false)
  const [qaAnalyzed, setQaAnalyzed] = useState(false)

  const qualityPage = (
    <section className="grid2">
      <div className="card">
        <h3>Computer Vision Quality Grading</h3>
        <p className="muted">Upload crop photo for simulated AI defect detection and grade classification.</p>
        <div className="field" style={{ marginTop: 12 }}>
          <label style={{ marginBottom: 8 }}>Produce Image</label>
          <input type="file" accept="image/*" onChange={e => setQaFileSelected(!!e.target.files?.length)} />
        </div>
        <button
          type="button"
          className="btn"
          style={{ marginTop: 18 }}
          onClick={() => {
            if (!qaFileSelected) setErrorMsg('Please choose an image file first.')
            else { setErrorMsg(''); setQaAnalyzed(true); }
          }}
        >
          Analyze Produce
        </button>
      </div>
      {qaAnalyzed && (
        <div className="card">
          <span className="demo">AI COMPUTER VISION REPORT</span>
          <h2 style={{ fontFamily: 'Fraunces', margin: '8px 0' }}>Tomato · Grade A Confirmed</h2>
          <div className="metric-row">
            <KPI label="Quality Score" value="94/100" trend="Premium" />
            <KPI label="Defect Rate" value="2.1%" trend="Low" />
            <KPI label="Maturity Index" value="Optimal" trend="Ready" />
          </div>
          <p className="muted" style={{ marginTop: 18 }}>
            Meets commercial grade export standards. Certified by simulation engine.
          </p>
        </div>
      )}
    </section>
  )

  // Page Routing Switch
  let pageContent: React.ReactNode
  if (page === 'Dashboard') {
    pageContent = dashStats
  } else if (page === 'My Produce') {
    pageContent = producePage
  } else if (page === 'Find Produce') {
    pageContent = findProducePage
  } else if (page === 'Post Requirement' || page === 'Matches' || page === 'Market Demand (Matches)') {
    pageContent = matchesPage
  } else if (page === 'Orders & Tracking' || page === 'All Orders') {
    pageContent = tracePage
  } else if (page === 'Escrow Ledger') {
    pageContent = escrowLedgerPage
  } else if (page === 'AI Recommendations' || page === 'Price Intelligence') {
    pageContent = pricePage
  } else if (page === 'AI Forecast' || page === 'Demand & Forecast') {
    pageContent = forecastPage
  } else if (page === 'Quality Check') {
    pageContent = qualityPage
  } else {
    pageContent = dashStats
  }

  // Floating Chat Assistant State
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<string[]>([])

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    const q = chatInput.trim()
    setChatInput('')
    setChatHistory(prev => [
      ...prev,
      `User: ${q}`,
      `AI: For "${q}", Karnataka local mandis report high tomato demand at ₹29–31/kg. Recommended route via NH44 reduces transit time by 42 minutes.`
    ])
  }

  return (
    <div className="shell">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mark"><Leaf size={18} /></span>
            Farmer Connect
          </div>
          <button type="button" className="mobile-close" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {nav[role]?.map(item => {
          const Icon = icons[item] || Box
          return (
            <div
              key={item}
              className={`sideitem ${page === item ? 'active' : ''}`}
              onClick={() => {
                setPage(item)
                setMenuOpen(false)
              }}
            >
              <Icon size={17} />
              {item}
            </div>
          )
        })}
      </aside>

      {menuOpen && <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} />}

      {/* Main Content Viewport */}
      <main className="content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="mobile-menu" onClick={() => setMenuOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <h1>{title}</h1>
              <span className="muted">
                {user.name} ({user.email}) · <span className="badge green" style={{ fontSize: 10 }}>{user.role}</span>
              </span>
            </div>
          </div>
          <div className="topright">
            <button
              onClick={logout}
              className="btn light"
              style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </header>

        {/* Global Notifications */}
        {errorMsg && (
          <div className="alert-box error">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
            <button type="button" className="close-btn" onClick={() => setErrorMsg('')}>×</button>
          </div>
        )}

        {successMsg && (
          <div className="alert-box success">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
            <button type="button" className="close-btn" onClick={() => setSuccessMsg('')}>×</button>
          </div>
        )}

        {/* Dynamic Page Content */}
        {pageContent}

        {/* Edit Produce Modal */}
        {editingProduce && (
          <div className="modal-overlay">
            <div className="modal-box">
              <div className="modal-header">
                <h3>Edit Produce Listing</h3>
                <button type="button" className="close-btn" onClick={() => setEditingProduce(null)}>×</button>
              </div>
              <form onSubmit={handleUpdateProduce}>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Crop</label>
                  <input value={editingProduce.crop} disabled />
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Quantity (kg)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingProduce.quantity}
                    onChange={e => setEditingProduce({ ...editingProduce, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>Expected Price (₹/kg)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingProduce.expectedPrice}
                    onChange={e => setEditingProduce({ ...editingProduce, expectedPrice: e.target.value })}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Listing Status</label>
                  <select
                    value={editingProduce.status}
                    onChange={e => setEditingProduce({ ...editingProduce, status: e.target.value })}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="COMMITTED">COMMITTED</option>
                    <option value="SOLD">SOLD</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn light" onClick={() => setEditingProduce(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Direct Order Modal for Buyers */}
        {buyingProduce && (
          <div className="modal-overlay">
            <div className="modal-box">
              <div className="modal-header">
                <h3>Order Produce: {buyingProduce.crop}</h3>
                <button type="button" className="close-btn" onClick={() => setBuyingProduce(null)}>×</button>
              </div>
              <p className="muted" style={{ margin: '-10px 0 16px', fontSize: 13 }}>
                Supplier: {buyingProduce.supplier?.name} · {buyingProduce.location} ({buyingProduce.qualityGrade})
              </p>
              <form
                onSubmit={e => {
                  e.preventDefault()
                  handlePlaceOrder(buyingProduce.id, null, buyQuantity)
                }}
              >
                <div className="field" style={{ marginBottom: 14 }}>
                  <label>Order Quantity (Max available: {buyingProduce.quantity} kg)</label>
                  <input
                    type="number"
                    min="1"
                    max={buyingProduce.quantity}
                    value={buyQuantity}
                    onChange={e => setBuyQuantity(Number(e.target.value))}
                    required
                  />
                </div>
                <div style={{ background: '#f5faf6', padding: 14, borderRadius: 8, marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>Unit Price:</span>
                    <b>₹{buyingProduce.expectedPrice}/kg</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: '#176b42' }}>
                    <span>Total Agreed Price:</span>
                    <span>₹{(buyingProduce.expectedPrice * buyQuantity).toLocaleString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn light" onClick={() => setBuyingProduce(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn" disabled={loading || buyQuantity <= 0 || buyQuantity > buyingProduce.quantity}>
                    {loading ? 'Submitting Order...' : 'Confirm Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI Chat Assistant Widget */}
        <div className="chat">
          <div
            className="chathead"
            style={{ cursor: 'pointer' }}
            onClick={() => setMobileChatOpen(!mobileChatOpen)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>✦ AgriFlow Assistant (Simulation)</span>
              <span className="mobile-only">{mobileChatOpen ? '▼' : '▲'}</span>
            </div>
          </div>
          <div className={`chatbody ${mobileChatOpen ? 'open' : ''}`}>
            <div className="bubble">
              Ask about market prices, buyers, transport routes, or demand trends.
            </div>
            {chatHistory.map((msg, i) => (
              <div key={i} className="bubble">
                {msg}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                placeholder="Ask about crops or prices..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSendChat()
                }}
              />
              <button type="button" className="btn" style={{ padding: '8px 12px' }} onClick={handleSendChat}>
                Send
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<'landing' | 'login' | 'app' | 'loading'>('loading')
  const [user, setUser] = useState<any>(null)
  const [page, setPage] = useState('Dashboard')

  useEffect(() => {
    const token = getToken()
    if (token) {
      apiFetch('/auth/me')
        .then(res => {
          setUser(res.data.user)
          setScreen('app')
        })
        .catch(() => {
          clearToken()
          setScreen('landing')
        })
    } else {
      setScreen('landing')
    }
  }, [])

  const handleLogout = () => {
    clearToken()
    setUser(null)
    setScreen('landing')
    setPage('Dashboard')
  }

  if (screen === 'loading') {
    return (
      <div style={{ display: 'grid', height: '100vh', placeItems: 'center', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="mark" style={{ margin: '0 auto 12px' }}><Leaf size={24} /></span>
          <p className="muted">Loading Farmer Connect...</p>
        </div>
      </div>
    )
  }

  if (screen === 'landing') {
    return <Landing go={() => setScreen('login')} />
  }

  if (screen === 'login') {
    return (
      <Auth
        enter={u => {
          setUser(u)
          setPage('Dashboard')
          setScreen('app')
        }}
      />
    )
  }

  return (
    <DashboardApp
      user={user}
      page={page}
      setPage={setPage}
      logout={handleLogout}
    />
  )
}
