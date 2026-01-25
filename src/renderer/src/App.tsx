import { useState, useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useAppStore } from './store/useAppStore'
import { useAuthStore } from './store/useAuthStore'
import { Login } from './components/Login'
import { ActivationScreen } from './components/ActivationScreen'
import Dashboard from './components/Dashboard'
import Customers from './components/Customers'
import Weighbridge from './components/Weighbridge'
import Crates from './components/Crates'
import Finance from './components/Finance'
import Reports from './components/Reports'
import Settings from './components/Settings'
import Duplicates from './components/Duplicates'
import CustomerDetails from './components/CustomerDetails'
import {
  LayoutDashboard,
  Users,
  Scale,
  Package,
  Wallet,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  ChevronRight,
  Bell,
  Copy
} from 'lucide-react'

function App() {
  const { version, isSidebarOpen, toggleSidebar } = useAppStore()
  const { user, setUser, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [isLicensed, setIsLicensed] = useState<boolean | null>(null)

  useEffect(() => {
    checkLicense()
  }, [])

  const checkLicense = async () => {
    try {
      const licensed = await window.api.license.check()
      setIsLicensed(licensed)
    } catch (error) {
      console.error('License check failed:', error)
      setIsLicensed(false)
    }
  }

  const handleActivationSuccess = () => {
    setIsLicensed(true)
  }

  if (isLicensed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري التحقق من الترخيص...</p>
        </div>
      </div>
    )
  }

  if (!isLicensed) {
    return <ActivationScreen onActivationSuccess={handleActivationSuccess} />
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />
  }

  const handleViewCustomer = (id: number) => {
    setSelectedCustomerId(id)
    setActiveTab('customer-details')
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'customers':
        return <Customers onViewCustomer={handleViewCustomer} />
      case 'customer-details':
        return selectedCustomerId ? (
          <CustomerDetails
            customerId={selectedCustomerId}
            onBack={() => setActiveTab('customers')}
          />
        ) : (
          <Customers onViewCustomer={handleViewCustomer} />
        )
      case 'weighbridge':
        return <Weighbridge />
      case 'crates':
        return <Crates />
      case 'finance':
        return <Finance />
      case 'reports':
        return <Reports />
      case 'duplicates':
        return <Duplicates />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <div
      className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans"
      dir="rtl"
    >
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col z-20 shadow-xl print:hidden`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
          {isSidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">
                D
              </div>
              <span className="font-bold text-lg tracking-tight">DATES V2</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <ChevronRight size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto px-2 space-y-1">
          <NavItem
            icon={<LayoutDashboard size={20} />}
            label="الرئيسية"
            isOpen={isSidebarOpen}
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
          />
          <NavItem
            icon={<Scale size={20} />}
            label="الميزان"
            isOpen={isSidebarOpen}
            active={activeTab === 'weighbridge'}
            onClick={() => setActiveTab('weighbridge')}
          />
          <NavItem
            icon={<Users size={20} />}
            label="العملاء"
            isOpen={isSidebarOpen}
            active={activeTab === 'customers'}
            onClick={() => setActiveTab('customers')}
          />
          <NavItem
            icon={<Package size={20} />}
            label="الصناديق"
            isOpen={isSidebarOpen}
            active={activeTab === 'crates'}
            onClick={() => setActiveTab('crates')}
          />
          <NavItem
            icon={<Wallet size={20} />}
            label="الحسابات"
            isOpen={isSidebarOpen}
            active={activeTab === 'finance'}
            onClick={() => setActiveTab('finance')}
          />
          <NavItem
            icon={<BarChart3 size={20} />}
            label="التقارير"
            isOpen={isSidebarOpen}
            active={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
          />
          <NavItem
            icon={<Copy size={20} />}
            label="العمليات المكررة"
            isOpen={isSidebarOpen}
            active={activeTab === 'duplicates'}
            onClick={() => setActiveTab('duplicates')}
          />
          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
            <NavItem
              icon={<SettingsIcon size={20} />}
              label="الإعدادات"
              isOpen={isSidebarOpen}
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
            />
            <NavItem
              icon={<LogOut size={20} />}
              label="خروج"
              isOpen={isSidebarOpen}
              onClick={logout}
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            />
          </div>
        </nav>

        {/* Footer Info */}
        {isSidebarOpen && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2">
            <div className="text-[10px] text-slate-400 text-center">الإصدار {version}</div>
            <a
              href="https://wa.me/201221089249"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
            >
              <span>للتواصل مع المطور</span>
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 z-10 shadow-sm print:hidden">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-xl text-slate-800 dark:text-white capitalize">
              {activeTab === 'dashboard' ? 'لوحة التحكم' : activeTab}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-left hidden sm:block">
                <p className="text-sm font-bold leading-none">{user.username}</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
                  {user.role}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar print:p-0 print:overflow-visible">
          {renderContent()}
        </div>
      </main>
      <ToastContainer position="bottom-right" theme="colored" rtl />
    </div>
  )
}

function NavItem({ icon, label, isOpen, active = false, onClick, className = '' }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group ${
        active
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
      } ${className}`}
    >
      <div
        className={`${active ? 'text-white' : 'group-hover:text-emerald-600'} transition-colors`}
      >
        {icon}
      </div>
      {isOpen && <span className="font-bold text-sm tracking-wide">{label}</span>}
    </button>
  )
}

export default App
