import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Phone, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  RotateCcw,
  CheckCircle2,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation, languages } from '../../context/LanguageContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';

export const LoginPage = () => {
  const { 
    sendOtp, 
    verifyOtp, 
    loginWithEmail, 
    registerWithEmail, 
    socialLogin, 
    loginAsDemo, 
    isAuthenticated 
  } = useAuth();
  const { currentLang, changeLanguage, t } = useTranslation();
  const navigate = useNavigate();

  // Auth modes: 'phone' | 'email' | 'signup'
  const [authMode, setAuthMode] = useState('phone');
  
  // Phone OTP states
  const [phone, setPhone] = useState('+91 98765 43210');
  const [otpStep, setOtpStep] = useState(false); // false = enter phone, true = enter OTP
  const [otpCode, setOtpCode] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState('');
  const [resendCountdown, setResendCountdown] = useState(60);

  // Email states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Resend OTP countdown
  useEffect(() => {
    let timer;
    if (otpStep && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpStep, resendCountdown]);

  // Handle Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!phone || phone.trim().length < 8) {
      setErrorMsg('Please enter a valid mobile number.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await sendOtp(phone);
      setOtpStep(true);
      setResendCountdown(60);
      if (res.demoOtp) {
        setDemoOtpHint(res.demoOtp);
        setOtpCode(res.demoOtp); // pre-populate demo otp for seamless friction-free testing
      }
      setSuccessMsg(`OTP sent to ${phone}.`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setIsLoading(true);
      await verifyOtp(phone, otpCode);
      navigate('/onboarding');
    } catch (err) {
      setErrorMsg(err.message || 'Invalid OTP code. Please verify.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setIsLoading(true);
      await loginWithEmail(email, password);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email Registration
  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setIsLoading(true);
      await registerWithEmail({ name, email, password, phone, language: currentLang });
      navigate('/onboarding');
    } catch (err) {
      setErrorMsg(err.message || 'Signup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Demo One-Click Login
  const handleDemoLogin = async () => {
    setErrorMsg('');
    try {
      setIsLoading(true);
      await loginAsDemo();
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Could not load demo patient account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/60 via-slate-50 to-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Top Brand & Language selector */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-md">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Healthify</h1>
            <p className="text-xs text-slate-500 font-medium">Personal Health Copilot</p>
          </div>
        </div>

        {/* Quick Language Toggle */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          <select
            value={currentLang}
            onChange={(e) => changeLanguage(e.target.value)}
            className="text-xs bg-transparent border-none text-slate-700 font-semibold focus:ring-0 py-1 pl-1 pr-6"
            aria-label="Change Language"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-card rounded-3xl border border-slate-200/80 space-y-6">
          
          {/* Header Description */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {authMode === 'signup'
                ? t('auth.signup')
                : t('auth.login')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Organize medical documents, medications, health timeline & emergency card.
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <Alert variant="danger" onClose={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}

          {successMsg && (
            <Alert variant="success" onClose={() => setSuccessMsg('')}>
              {successMsg}
            </Alert>
          )}

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('phone');
                setErrorMsg('');
              }}
              className={`py-2 rounded-lg transition-all ${
                authMode === 'phone'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Phone OTP
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('email');
                setErrorMsg('');
              }}
              className={`py-2 rounded-lg transition-all ${
                authMode === 'email' || authMode === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Email & Password
            </button>
          </div>

          {/* 1. Phone OTP Form */}
          {authMode === 'phone' && (
            <div className="space-y-4">
              {!otpStep ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <Input
                    label={t('auth.phone')}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    leftIcon={<Phone className="w-4 h-4" />}
                    required
                    helperText="We will send a 6-digit OTP code to verify your device."
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    {t('auth.sendOtp')}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700 uppercase">
                        {t('auth.enterOtp')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtpStep(false)}
                        className="text-xs text-teal-600 hover:underline"
                      >
                        Change Phone
                      </button>
                    </div>

                    <Input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="text-center tracking-widest text-lg font-bold"
                      required
                    />

                    {demoOtpHint && (
                      <div className="mt-2 p-2 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-between text-xs text-teal-800">
                        <span className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          Demo verification code:
                        </span>
                        <code className="font-mono font-bold text-teal-900 bg-white px-2 py-0.5 rounded border border-teal-200">
                          {demoOtpHint}
                        </code>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {resendCountdown > 0 ? (
                        `Resend code in ${resendCountdown}s`
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-teal-600 font-semibold hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Resend OTP
                        </button>
                      )}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isLoading}
                  >
                    {t('auth.verifyOtp')}
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* 2. Email Login Form */}
          {authMode === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <Input
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label={t('auth.password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                {t('auth.login')}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className="text-xs text-teal-700 font-semibold hover:underline"
                >
                  Need an account? Create one here
                </button>
              </div>
            </form>
          )}

          {/* 3. Signup Form */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arun Kumar"
                leftIcon={<User className="w-4 h-4" />}
                required
              />

              <Input
                label={t('auth.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patient@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label={t('auth.phone')}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                leftIcon={<Phone className="w-4 h-4" />}
              />

              <Input
                label={t('auth.password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                {t('auth.signup')}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('email')}
                  className="text-xs text-teal-700 font-semibold hover:underline"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400 font-medium uppercase tracking-wider">
                Or Quick Access
              </span>
            </div>
          </div>

          {/* 1-Click Demo Patient Button */}
          <div>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="
                w-full p-3.5 rounded-2xl border-2 border-teal-500/40 bg-teal-50/70
                hover:bg-teal-100/70 text-teal-900 transition-all flex items-center justify-between
                shadow-xs hover:shadow active:scale-[0.99]
              "
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-teal-950">
                    Try Instant Demo Account
                  </p>
                  <p className="text-[11px] text-teal-800">
                    Preloaded records: Arun Kumar, Metformin, BP trends, ABHA ID
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-teal-700 flex-shrink-0" />
            </button>
          </div>

          {/* Social OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => socialLogin('google', 'google_patient@healthify.internal', 'Google Patient')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => socialLogin('apple', 'apple_patient@healthify.internal', 'Apple Patient')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4 fill-slate-900" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.07-7.69-7.85-12.01-14.34-6.19-9.36-11.06-20.1-14.61-32.22-3.55-12.12-5.33-23.23-5.33-33.34 0-14.88 3.82-27.18 11.46-36.9 7.64-9.72 17.2-14.68 28.69-14.88 5.66 0 11.95 1.52 18.87 4.56 6.92 3.04 11.43 4.63 13.54 4.77 1.83 0 6.64-1.74 14.42-5.22 7.78-3.48 14.46-5.06 20.04-4.75 14.88.75 26.69 6.22 35.43 16.42-13.06 7.9-19.46 18.66-19.2 32.29.25 10.74 4.3 19.64 12.16 26.71 7.85 7.07 17.18 11.04 27.99 11.9-2.46 7.55-5.5 15.15-9.11 22.8zM119.22 33.02c0-7.39 2.67-14.37 8.01-20.93 5.34-6.56 12.01-10.87 20.02-12.93.42 2.14.63 4.28.63 6.42 0 7.39-2.77 14.65-8.32 21.78-5.55 7.13-12.38 11.39-20.49 12.78-.15-2.47-.23-4.84-.23-7.12z"/>
              </svg>
              <span>Apple</span>
            </button>
          </div>

          {/* Privacy & Security Tag */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>End-to-End Encrypted Healthcare Session</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;
