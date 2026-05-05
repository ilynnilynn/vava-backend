import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | VAVA',
}

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', lineHeight: 1.7 }}>
      <h1>Privacy Policy / 隱私權政策</h1>
      <p><strong>Last updated / 最後更新日期：</strong> May 2026</p>

      <hr />

      <h2>English Version</h2>

      <h3>1. Overview</h3>
      <p>
        VAVA (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates a beauty service booking platform that connects users with independent beauty professionals.
        We value your privacy and handle your personal data in accordance with applicable laws and regulations.
      </p>

      <h3>2. Information We Collect</h3>
      <ul>
        <li><strong>Account Information:</strong> Name, email address, phone number</li>
        <li><strong>Authentication Data:</strong> Apple Sign-In or Google Sign-In</li>
        <li><strong>Usage Data:</strong> Booking requests, preferences, and app interactions</li>
        <li><strong>Professional Verification Data:</strong> ID photos and business information</li>
      </ul>

      <h3>3. How We Use Your Data</h3>
      <ul>
        <li>Provide and operate the VAVA platform</li>
        <li>Enable booking and matching</li>
        <li>Verify professional identity</li>
        <li>Improve product experience</li>
        <li>Communicate service updates</li>
      </ul>

      <h3>4. Data Storage and Security</h3>
      <p>
        Your data is securely stored using trusted third-party infrastructure (e.g., Supabase).
        ID verification images are stored in private storage and are only accessible to authorized personnel.
      </p>

      <h3>5. Third-Party Services</h3>
      <ul>
        <li>Supabase (database and storage)</li>
        <li>Apple Sign-In</li>
        <li>Google Sign-In</li>
      </ul>

      <h3>6. Data Sharing</h3>
      <p>
        We do not sell your personal data. Data may be shared only as necessary to provide services or comply with legal obligations.
      </p>

      <h3>7. Data Retention</h3>
      <ul>
        <li>Account data: until account deletion</li>
        <li>Verification data: retained as needed for safety and compliance</li>
        <li>Usage data: for service improvement</li>
      </ul>

      <h3>8. Your Rights</h3>
      <p>
        You may request to access, correct, or delete your data. Contact: hello@vava.now
      </p>

      <h3>9. Changes</h3>
      <p>
        We may update this policy. Changes will be posted on this page.
      </p>

      <hr />

      <h2>繁體中文版本（台灣）</h2>

      <h3>一、總則</h3>
      <p>
        VAVA（以下簡稱「本平台」）提供美業服務媒合與預約服務，重視您的個人資料保護，
        並依據《個人資料保護法》及相關法規處理您的資料。
      </p>

      <h3>二、資料蒐集範圍</h3>
      <ul>
        <li>帳戶資料：姓名、Email、手機號碼</li>
        <li>登入資料：Apple 或 Google 登入資訊</li>
        <li>使用資料：預約紀錄與使用行為</li>
        <li>設計師驗證資料：身分證明文件與商業資料</li>
      </ul>

      <h3>三、資料利用目的</h3>
      <ul>
        <li>提供預約與媒合服務</li>
        <li>設計師身分驗證</li>
        <li>優化產品體驗</li>
        <li>客戶服務與通知</li>
      </ul>

      <h3>四、資料保護措施</h3>
      <p>
        本平台採用加密傳輸（HTTPS），並將驗證資料儲存於非公開（私有）儲存空間，
        僅授權人員可存取。
      </p>

      <h3>五、第三方服務</h3>
      <ul>
        <li>Supabase（資料庫與儲存）</li>
        <li>Apple 登入</li>
        <li>Google 登入</li>
      </ul>

      <h3>六、資料分享</h3>
      <p>
        本平台不會販售您的個人資料，僅於提供服務或法律要求下分享必要資料。
      </p>

      <h3>七、資料保存期限</h3>
      <ul>
        <li>帳戶資料：至帳戶刪除</li>
        <li>驗證資料：依安全與合規需求保存</li>
        <li>使用資料：用於服務優化</li>
      </ul>

      <h3>八、您的權利</h3>
      <p>
        您可查詢、更正或刪除個人資料。聯絡信箱：hello@vava.now
      </p>

      <h3>九、政策變更</h3>
      <p>
        本政策將視情況更新，並公告於本頁面。
      </p>
    </main>
  )
}
