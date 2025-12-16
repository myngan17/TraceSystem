import { LoginForm } from "@/components/login-form"
import { Leaf, Shield, Sparkles, TrendingUp } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and branding with enhanced design */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 opacity-20 blur-xl animate-pulse"></div>
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 shadow-xl">
                <Leaf className="w-9 h-9 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                Supply Chain Platform
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Nền tảng blockchain cho chuỗi cung ứng nông sản
              </p>
            </div>
          </div>

          {/* Login Form with card styling */}
          <div className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 p-8">
            <LoginForm />
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-600 dark:text-gray-400">
            Bằng cách đăng nhập, bạn đồng ý với{" "}
            <a href="#" className="text-green-600 hover:underline font-medium">
              Điều khoản dịch vụ
            </a>{" "}
            và{" "}
            <a href="#" className="text-green-600 hover:underline font-medium">
              Chính sách bảo mật
            </a>
          </p>
        </div>
      </div>

      {/* Right side - Image and branding */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600" />

        {/* Background image with overlay */}
        <img
          src="/green-agricultural-field-with-fresh-vegetables-and.jpg"
          alt="Agricultural field"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30"
        />

        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

        {/* Content overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Header logo */}
          <div>
            <div className="flex items-center space-x-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Leaf className="w-7 h-7" />
              </div>
              <span className="text-2xl font-bold">AgriChain</span>
            </div>
          </div>

          {/* Main content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-semibold">Minh bạch • Tin cậy • Bền vững</span>
              </div>
              <h2 className="text-5xl font-bold leading-tight text-balance">
                Quản lý nguồn gốc nông sản từ trang trại đến người tiêu dùng
              </h2>
              <p className="text-xl text-white/90 leading-relaxed">
                Công nghệ blockchain đảm bảo truy xuất nguồn gốc minh bạch, nâng cao uy tín thương hiệu và xây dựng niềm
                tin với khách hàng.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/20">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <div className="text-4xl font-bold">10K+</div>
                </div>
                <div className="text-sm text-white/80">Sản phẩm đã đăng ký</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <div className="text-4xl font-bold">500+</div>
                </div>
                <div className="text-sm text-white/80">Nhà sản xuất tin dùng</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <div className="text-4xl font-bold">99.9%</div>
                </div>
                <div className="text-sm text-white/80">Thời gian hoạt động</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
