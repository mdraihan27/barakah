import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../LanguageContext';
import { authAPI } from '../../api/auth';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card, { CardBody } from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';

export default function Profile() {
  const { user, isShopOwner, refreshUser } = useAuth();
  const { isBangla } = useLanguage();

  const [changingPassword, setChangingPassword] = useState(false);
  const [oldEmail] = useState(user?.email || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      await authAPI.uploadMyAvatar(file);
      await refreshUser();
      toast.success(isBangla ? 'প্রোফাইল ছবি আপডেট হয়েছে' : 'Profile image updated');
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Failed to update profile image');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSendResetCode = async () => {
    setLoading(true);
    try {
      await authAPI.forgotPassword(oldEmail);
      setCodeSent(true);
      toast.success(isBangla ? 'কোড পাঠানো হয়েছে' : 'Code sent to your email');
    } catch {
      toast.error('Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(isBangla ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email: oldEmail, code, new_password: newPassword });
      toast.success(isBangla ? 'পাসওয়ার্ড বদলানো হয়েছে!' : 'Password changed!');
      setChangingPassword(false);
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setCodeSent(false);
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === 'string' ? msg : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="font-cerialebaran text-[24px] text-heading mb-6">
          {isBangla ? 'প্রোফাইল' : 'Profile'}
        </h1>

        {/* profile card */}
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center gap-5">
              <div className="flex flex-col items-center gap-2">
                <Avatar name={fullName} src={user?.avatar_url} size="xl" />
                <label className="text-[12px] font-medium text-emerald-700 dark:text-emerald-300 cursor-pointer hover:underline">
                  {uploadingAvatar ? '...' : (isBangla ? 'ছবি আপলোড' : 'Upload Photo')}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />
                </label>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-heading">{fullName}</h2>
                <p className="text-[13px] text-muted">{user?.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge color={isShopOwner ? 'emerald' : 'gold'}>
                    {isShopOwner ? (isBangla ? 'দোকানদার' : 'Shop Owner') : (isBangla ? 'ক্রেতা' : 'Consumer')}
                  </Badge>
                  {user?.is_email_verified ? (
                    <Badge color="emerald">{isBangla ? 'ভেরিফাইড' : 'Verified'}</Badge>
                  ) : (
                    <Badge color="red">{isBangla ? 'আনভেরিফাইড' : 'Not Verified'}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* info card */}
        <Card className="mb-6">
          <CardBody>
            <h3 className="text-[14px] font-semibold text-heading mb-4">
              {isBangla ? 'একাউন্ট তথ্য' : 'Account Information'}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-white/[0.04]">
                <span className="text-[13px] text-muted">{isBangla ? 'নামের প্রথম অংশ' : 'First Name'}</span>
                <span className="text-[13px] text-heading">{user?.first_name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-white/[0.04]">
                <span className="text-[13px] text-muted">{isBangla ? 'নামের শেষ অংশ' : 'Last Name'}</span>
                <span className="text-[13px] text-heading">{user?.last_name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-white/[0.04]">
                <span className="text-[13px] text-muted">{isBangla ? 'ইমেইল' : 'Email'}</span>
                <span className="text-[13px] text-heading">{user?.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-stone-100 dark:border-white/[0.04]">
                <span className="text-[13px] text-muted">{isBangla ? 'লগ ইন পদ্ধতি' : 'Auth Provider'}</span>
                <span className="text-[13px] text-heading capitalize">{user?.auth_provider || 'local'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[13px] text-muted">{isBangla ? 'যোগদানের তারিখ' : 'Member Since'}</span>
                <span className="text-[13px] text-heading">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* change password */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-heading">
                {isBangla ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
              </h3>
              {!changingPassword && (
                <button onClick={() => setChangingPassword(true)}
                  className="text-[12px] font-medium text-emerald-700 dark:text-emerald-300 hover:underline">
                  {isBangla ? 'পরিবর্তন করুন' : 'Change'}
                </button>
              )}
            </div>

            {changingPassword && (
              <div>
                {!codeSent ? (
                  <div className="space-y-3">
                    <p className="text-[13px] text-body">
                      {isBangla ? 'আপনার ইমেইলে একটি কোড পাঠানো হবে।' : "We'll send a verification code to your email."}
                    </p>
                    <button onClick={handleSendResetCode} disabled={loading}
                      className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
                      {loading ? '...' : (isBangla ? 'কোড পাঠান' : 'Send Code')}
                    </button>
                  </div>
                ) : (
                  <form className="space-y-3" onSubmit={handleResetPassword}>
                    <div>
                      <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'কোড' : 'Code'}</label>
                      <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} type="text" maxLength={6} placeholder="000000"
                        className="w-full max-w-[180px] rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-2.5 text-[16px] tracking-[0.4em] text-heading dark:text-white text-center font-mono placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'নতুন পাসওয়ার্ড' : 'New Password'}</label>
                      <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" required placeholder="••••••••"
                        className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-2.5 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-body mb-1.5">{isBangla ? 'পাসওয়ার্ড আবার' : 'Confirm Password'}</label>
                      <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required placeholder="••••••••"
                        className="w-full rounded-xl bg-white/80 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.08] px-4 py-2.5 text-[14px] text-heading dark:text-white placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={loading}
                        className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
                        {loading ? '...' : (isBangla ? 'রিসেট করুন' : 'Reset Password')}
                      </button>
                      <button type="button" onClick={() => { setChangingPassword(false); setCodeSent(false); }}
                        className="rounded-xl border border-stone-200/70 dark:border-white/[0.08] px-5 py-2.5 text-[13px] font-medium text-body hover:bg-stone-50 dark:hover:bg-white/[0.03] transition">
                        {isBangla ? 'বাতিল' : 'Cancel'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
}
