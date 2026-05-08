import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms & Conditions | VAVA',
}

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', lineHeight: 1.7 }}>
      <h1>Terms &amp; Conditions / 使用條款與條件</h1>
      <p><strong>Last updated / 最後更新日期：</strong> May 2026</p>

      <hr />

      <h2>English Version</h2>

      <h3>1. Acceptance of Terms</h3>
      <p>
        By downloading, accessing, or using the VAVA platform (&ldquo;Platform&rdquo;, &ldquo;App&rdquo;, or &ldquo;Service&rdquo;),
        you agree to be bound by these Terms &amp; Conditions (&ldquo;Terms&rdquo;). If you do not agree to these Terms,
        do not use the Platform. Your continued use of the Platform constitutes ongoing acceptance of any updates to these Terms.
      </p>

      <h3>2. Service Description</h3>
      <p>
        VAVA is a last-minute beauty booking platform that connects customers with independent beauty professionals
        offering services such as nail care, lash extensions, and related beauty treatments. VAVA provides the
        technology infrastructure to facilitate discovery, booking, and payment; it does not itself provide beauty services.
      </p>

      <h3>3. Definitions</h3>
      <ul>
        <li><strong>&ldquo;Platform&rdquo;</strong> means the VAVA mobile application, website, and related services.</li>
        <li><strong>&ldquo;VAVA&rdquo;</strong> means VAVA and its affiliates, officers, employees, and agents.</li>
        <li><strong>&ldquo;Customer&rdquo;</strong> means any user who registers to book beauty services through the Platform.</li>
        <li><strong>&ldquo;Professional&rdquo;</strong> means an independent beauty service provider registered on the Platform.</li>
        <li><strong>&ldquo;Booking&rdquo;</strong> means a confirmed appointment between a Customer and a Professional facilitated via the Platform.</li>
        <li><strong>&ldquo;Content&rdquo;</strong> means text, images, reviews, and other material uploaded or submitted by users.</li>
      </ul>

      <h3>4. Eligibility</h3>
      <p>
        <strong>General users and Customers:</strong> You must be at least 18 years of age to use the Platform independently.
        Users aged 13 to 17 may only use the Platform with the explicit consent and direct supervision of a parent or legal guardian,
        who assumes full responsibility for the minor&rsquo;s use of the Platform. Children under 13 are not permitted to use the Platform.
      </p>
      <p>
        <strong>Professional accounts:</strong> You must be at least 18 years of age to register as a Professional on the Platform.
        No exceptions apply. By registering as a Professional, you represent and warrant that you are 18 or older.
      </p>

      <h3>5. Account Registration and Security</h3>
      <p>
        You must provide accurate, current, and complete information when creating an account and keep it up to date.
        You are solely responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.
        Notify us immediately at <a href="mailto:hello@vava.now">hello@vava.now</a> if you suspect unauthorized access.
        VAVA is not liable for any loss resulting from unauthorized use of your account.
      </p>

      <h3>6. License to Use the Platform</h3>
      <p>
        Subject to your compliance with these Terms, VAVA grants you a limited, non-exclusive, non-transferable,
        revocable license to access and use the Platform for its intended personal, non-commercial purposes.
        This license does not include any right to resell, sublicense, or commercially exploit the Platform or its content.
      </p>

      <h3>7. Restrictions</h3>
      <p>You may not:</p>
      <ul>
        <li>Use the Platform for any unlawful purpose or in violation of any applicable laws or regulations.</li>
        <li>Reverse engineer, decompile, disassemble, or attempt to derive source code from the Platform.</li>
        <li>Scrape, crawl, or use automated tools to extract data from the Platform without prior written consent.</li>
        <li>Impersonate any person or entity, or misrepresent your affiliation with any person or entity.</li>
        <li>Post false, misleading, defamatory, or fraudulent content or reviews.</li>
        <li>Harass, threaten, or harm other users or Professionals.</li>
        <li>Circumvent any security features or payment mechanisms of the Platform.</li>
        <li>Use the Platform to solicit off-platform bookings or payments to bypass VAVA&rsquo;s systems.</li>
      </ul>

      <h3>8. Booking and Matching Mechanism</h3>
      <p>
        Customers submit booking requests specifying service type, desired date, time, and location.
        The Platform broadcasts the request to available Professionals in the area. Bookings are confirmed
        on a first-accept basis. Once confirmed, both parties receive a notification and the booking details are locked.
        VAVA does not guarantee the availability of any specific Professional or time slot.
      </p>

      <h3>9. First-Accept Confirmation</h3>
      <p>
        The first available Professional to accept a Customer&rsquo;s request confirms the booking.
        No other Professional may claim the same booking after confirmation. Customers acknowledge
        that this mechanism may result in booking by a Professional of VAVA&rsquo;s choosing from those available,
        and consent to this process by submitting a request.
      </p>

      <h3>10. Professional Independence</h3>
      <p>
        Professionals on the Platform are independent contractors, not employees, agents, or partners of VAVA.
        VAVA does not control the manner in which Professionals perform their services, their tools, techniques,
        products, or professional decisions. Any professional advice, recommendations, or actions taken by a Professional
        are solely their own responsibility. VAVA is not liable for the quality, safety, or outcome of any service
        provided by a Professional.
      </p>

      <h3>11. Customer Responsibilities</h3>
      <ul>
        <li>Arrive at the agreed location on time and prepared for the service.</li>
        <li>Provide accurate service requirements, preferences, and relevant health or allergy information before or at the time of booking.</li>
        <li>Treat Professionals with respect. Harassment, abuse, or inappropriate conduct will result in account suspension.</li>
        <li>Ensure the service environment (if at-home) is safe, accessible, and suitable for the requested service.</li>
        <li>Make payment through the Platform as agreed. Off-platform cash payments are not supported or endorsed by VAVA.</li>
      </ul>

      <h3>12. Professional Responsibilities</h3>
      <ul>
        <li>Provide accurate profiles, service listings, pricing, availability, and portfolio images.</li>
        <li>Arrive punctually and prepared with all necessary tools, products, and hygiene supplies.</li>
        <li>Maintain hygiene, sanitation, and safety standards in accordance with applicable professional regulations.</li>
        <li>Communicate promptly with Customers regarding any changes, delays, or issues.</li>
        <li>Not request or accept off-platform payments for bookings made through VAVA.</li>
        <li>Hold any required professional licenses or certifications as required by law in the jurisdiction of service.</li>
      </ul>

      <h3>13. Pricing, Fees, and Payment</h3>
      <p>
        Service prices are set by individual Professionals and displayed on the Platform at the time of booking.
        VAVA may charge a platform service fee, which will be disclosed prior to booking confirmation.
        All payments are processed through the Platform&rsquo;s designated payment provider. By completing a booking,
        you authorize VAVA to charge the applicable fees to your selected payment method.
        VAVA reserves the right to update its fee structure with notice to users.
      </p>

      <h3>14. App Store and Third-Party Payment Rules</h3>
      <p>
        The VAVA app is distributed through the Apple App Store and Google Play Store.
        In-app purchases and subscriptions are subject to the applicable App Store or Google Play terms and policies,
        including those governing billing, refunds, and subscription management.
        Apple and Google are not parties to these Terms and bear no liability for Platform services.
        Any billing inquiries related to App Store or Play Store purchases must be directed to Apple or Google respectively.
      </p>

      <h3>15. Cancellation Policy</h3>
      <p>
        Customers may cancel a confirmed booking free of charge up to <strong>2 hours</strong> before the scheduled appointment time.
        Cancellations made within 2 hours of the appointment may incur a cancellation fee.
        Professionals who cancel a confirmed booking without reasonable cause may be subject to account penalties.
        VAVA reserves the right to update cancellation windows and fees, and will notify users of any such changes.
      </p>

      <h3>16. No-Show and Late Arrival</h3>
      <p>
        If a Customer fails to appear for a confirmed booking without prior cancellation (&ldquo;no-show&rdquo;),
        the booking may be charged in full and no refund will be issued.
        If a Customer arrives more than 15 minutes late, the Professional may, at their discretion, modify the scope
        of service or treat the booking as a no-show. Repeated no-shows may result in account suspension.
      </p>

      <h3>17. Refunds</h3>
      <p>
        Refunds are evaluated on a case-by-case basis. A refund may be issued if: (a) a Professional cancels
        a confirmed booking; (b) a service was not performed due to a fault attributable to the Professional;
        or (c) a technical billing error occurred. Refunds are not issued for dissatisfaction with service quality alone,
        given that Professionals are independent contractors. Requests must be submitted within 72 hours of the appointment
        via <a href="mailto:hello@vava.now">hello@vava.now</a>.
      </p>

      <h3>18. Consumer Protection and 7-Day Cooling-Off Period</h3>
      <p>
        Under Taiwan&rsquo;s Consumer Protection Act, consumers who purchase services through non-face-to-face
        transactions (including in-app purchases) have the right to withdraw from the transaction within
        <strong>7 days</strong> without providing a reason (&ldquo;7-day cooling-off period&rdquo;).
        This right applies to prepaid credits, subscriptions, or service packages purchased on the Platform,
        to the extent permitted by law. This right does not apply to individual, already-performed beauty service bookings
        or digital goods that have been delivered and fully consumed. To exercise this right, contact
        <a href="mailto:hello@vava.now">hello@vava.now</a> within the 7-day period.
      </p>

      <h3>19. Service Quality, Safety, Allergies, and Results</h3>
      <p>
        VAVA does not guarantee specific results or outcomes from beauty services. Customers are solely responsible
        for disclosing any known allergies, skin sensitivities, medical conditions, or contraindications to the Professional
        before the service commences. VAVA is not liable for any adverse reactions, injuries, or dissatisfaction
        arising from failure to disclose relevant information or from the inherent nature of beauty treatments.
        If you experience an adverse reaction, seek appropriate medical attention immediately.
      </p>

      <h3>20. User Content</h3>
      <p>
        You retain ownership of Content you submit to the Platform. By submitting Content, you grant VAVA a
        worldwide, royalty-free, non-exclusive license to use, reproduce, modify, and display such Content
        for the purposes of operating and promoting the Platform. You represent that you have all necessary rights
        to grant this license. VAVA may remove any Content that violates these Terms or applicable law.
      </p>

      <h3>21. Reviews and Ratings</h3>
      <p>
        After a completed booking, Customers and Professionals may leave honest reviews and ratings.
        Reviews must be genuine and based on actual experience. VAVA prohibits fake, incentivized, or retaliatory reviews.
        VAVA reserves the right to remove reviews that violate these Terms. Review removal requests may be submitted
        to <a href="mailto:hello@vava.now">hello@vava.now</a>.
      </p>

      <h3>22. Personal Data and Privacy</h3>
      <p>
        Your use of the Platform is also governed by our{' '}
        <a href="/privacy">Privacy Policy</a>, which is incorporated into these Terms by reference.
        By using the Platform, you consent to the collection and use of your information as described therein.
      </p>

      <h3>23. Communications and Notifications</h3>
      <p>
        By creating an account, you consent to receive transactional notifications (booking confirmations, reminders,
        and cancellations) via push notification, email, or SMS. You may opt out of marketing communications
        at any time through your account settings. Opting out of transactional notifications may impair Platform functionality.
      </p>

      <h3>24. Third-Party Services and Links</h3>
      <p>
        The Platform may contain links to or integrate with third-party services (e.g., payment processors,
        map providers, social login providers). VAVA is not responsible for the content, privacy practices,
        or reliability of any third-party service. Use of third-party services is subject to their respective terms.
      </p>

      <h3>25. Platform Availability</h3>
      <p>
        VAVA strives to maintain Platform availability but does not guarantee uninterrupted or error-free service.
        The Platform may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control.
        VAVA is not liable for any loss or inconvenience resulting from Platform downtime or unavailability.
      </p>

      <h3>26. Intellectual Property</h3>
      <p>
        All Platform content, features, functionality, design, logos, trademarks, and software are the exclusive
        property of VAVA or its licensors and are protected by applicable intellectual property laws.
        Nothing in these Terms grants you any right, title, or interest in VAVA&rsquo;s intellectual property
        beyond the limited license described herein. Unauthorized use of VAVA&rsquo;s intellectual property is strictly prohibited.
      </p>

      <h3>27. Promotions, Credits, and Discounts</h3>
      <p>
        VAVA may from time to time offer promotional credits, discount codes, or referral incentives.
        These are non-transferable, have no cash value, may not be combined with other offers unless stated,
        and may expire. VAVA reserves the right to modify or discontinue promotions at any time.
        Credits obtained through fraudulent or abusive means will be forfeited.
      </p>

      <h3>28. Account Suspension and Termination</h3>
      <p>
        VAVA may suspend or terminate your account at any time if you violate these Terms, engage in fraudulent activity,
        pose a safety risk to other users, or for any other reason at VAVA&rsquo;s sole discretion.
        Upon termination, your license to use the Platform ceases immediately. You may request account deletion
        by contacting <a href="mailto:hello@vava.now">hello@vava.now</a>.
        Termination does not affect any rights or obligations accrued prior to termination.
      </p>

      <h3>29. Disclaimer</h3>
      <p>
        THE PLATFORM AND ALL SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
        EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
        OR NON-INFRINGEMENT. VAVA DOES NOT WARRANT THAT THE PLATFORM WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED.
      </p>

      <h3>30. Limitation of Liability</h3>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, VAVA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
        SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF
        OR IN CONNECTION WITH YOUR USE OF THE PLATFORM OR ANY BOOKING, WHETHER BASED ON CONTRACT, TORT, STATUTE,
        OR OTHERWISE. IN NO EVENT SHALL VAVA&rsquo;S TOTAL CUMULATIVE LIABILITY TO YOU EXCEED THE GREATER OF
        THE AMOUNT YOU PAID TO VAVA IN THE 3 MONTHS PRECEDING THE CLAIM OR TWD 3,000 (THREE THOUSAND NEW TAIWAN DOLLARS).
      </p>

      <h3>31. Indemnity</h3>
      <p>
        You agree to defend, indemnify, and hold harmless VAVA and its affiliates, directors, officers, employees,
        and agents from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable
        legal fees) arising out of or related to: (a) your use of the Platform; (b) your violation of these Terms;
        (c) Content you submit; or (d) your violation of any applicable law or the rights of any third party.
      </p>

      <h3>32. Dispute Resolution and Customer Support</h3>
      <p>
        If you have a dispute or complaint, please contact our customer support team first at{' '}
        <a href="mailto:hello@vava.now">hello@vava.now</a>. We will endeavor to resolve disputes amicably within 14 business days.
        If a dispute cannot be resolved through direct negotiation, the parties agree to attempt mediation
        before initiating formal legal proceedings.
      </p>

      <h3>33. Governing Law and Jurisdiction</h3>
      <p>
        These Terms shall be governed by and construed in accordance with the laws of the Republic of China (Taiwan).
        Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction
        of the Taiwan Taipei District Court as the court of first instance, unless mandatory consumer protection laws
        in your jurisdiction provide otherwise.
      </p>

      <h3>34. Changes to These Terms</h3>
      <p>
        VAVA may update these Terms at any time. If we make material changes, we will notify you via the Platform,
        email, or push notification at least 7 days before the changes take effect. Your continued use of the Platform
        after the effective date constitutes acceptance of the updated Terms. If you do not agree, you must stop using
        the Platform before the effective date.
      </p>

      <h3>35. Electronic Documents</h3>
      <p>
        These Terms constitute an electronic document within the meaning of Taiwan&rsquo;s Electronic Signatures Act.
        By accepting these Terms electronically, you agree that electronic acceptance has the same legal force
        as a written signature.
      </p>

      <h3>36. Language</h3>
      <p>
        These Terms are provided in both English and Traditional Chinese. In the event of any inconsistency between the two versions,
        the Traditional Chinese version shall prevail for users in Taiwan. The English version governs in all other jurisdictions.
      </p>

      <h3>37. Severability</h3>
      <p>
        If any provision of these Terms is found to be invalid, illegal, or unenforceable, the remaining provisions
        shall continue in full force and effect. The invalid provision shall be modified to the minimum extent
        necessary to make it enforceable.
      </p>

      <h3>38. Entire Agreement</h3>
      <p>
        These Terms, together with the <a href="/privacy">Privacy Policy</a> and any other policies or guidelines
        incorporated by reference, constitute the entire agreement between you and VAVA with respect to your use of the Platform
        and supersede all prior agreements, representations, or understandings.
      </p>

      <h3>39. Contact</h3>
      <p>
        For questions, complaints, or requests relating to these Terms, please contact us at:{' '}
        <a href="mailto:hello@vava.now">hello@vava.now</a>
      </p>

      <hr />

      <h2>繁體中文版本（台灣）</h2>

      <h3>一、條款接受</h3>
      <p>
        當您下載、存取或使用 VAVA 平台（以下簡稱「本平台」、「本應用程式」或「本服務」），即表示您同意遵守本使用條款與條件（以下簡稱「本條款」）。
        如您不同意本條款，請勿使用本平台。您持續使用本平台，即代表您接受本條款之任何更新內容。
      </p>

      <h3>二、服務說明</h3>
      <p>
        VAVA 是一個即時美業預約平台，連結顧客與獨立美業工作者，提供美甲、美睫及相關美容服務。
        VAVA 提供技術基礎設施以促成探索、預約與付款；本平台本身並不直接提供美業服務。
      </p>

      <h3>三、定義</h3>
      <ul>
        <li><strong>「本平台」</strong>指 VAVA 行動應用程式、網站及相關服務。</li>
        <li><strong>「VAVA」</strong>指 VAVA 及其關係企業、董事、員工與代理人。</li>
        <li><strong>「顧客」</strong>指透過本平台預約美業服務的註冊使用者。</li>
        <li><strong>「設計師」</strong>（或「專業工作者」）指在本平台上登記的獨立美業服務提供者。</li>
        <li><strong>「預約」</strong>指透過本平台促成的顧客與設計師間已確認的服務時段。</li>
        <li><strong>「內容」</strong>指使用者上傳或提交的文字、圖片、評論及其他材料。</li>
      </ul>

      <h3>四、使用資格</h3>
      <p>
        <strong>一般使用者及顧客：</strong>您必須年滿 18 歲方可獨立使用本平台。
        13 至 17 歲未成年人僅可在父母或法定監護人明確同意並直接監督下使用本平台，
        父母或法定監護人須對未成年人的使用行為承擔完全責任。未滿 13 歲之兒童不得使用本平台。
      </p>
      <p>
        <strong>設計師帳戶：</strong>在本平台上登記為設計師，您必須年滿 18 歲，無任何例外。
        您於登記時即聲明並保證您已年滿 18 歲。
      </p>

      <h3>五、帳戶註冊與安全</h3>
      <p>
        您必須在建立帳戶時提供準確、最新且完整的資訊，並持續更新。
        您須獨立負責保管您的登入憑證，並對在您帳戶下發生的所有活動負責。
        若您懷疑有未經授權的存取，請立即聯絡我們：<a href="mailto:hello@vava.now">hello@vava.now</a>。
        VAVA 對因您帳戶遭未經授權使用而造成的損失不負任何責任。
      </p>

      <h3>六、平台使用授權</h3>
      <p>
        在您遵守本條款的前提下，VAVA 授予您有限、非獨家、不可轉讓、可撤銷的授權，
        以存取及使用本平台供個人非商業目的使用。
        本授權不包含轉售、再授權或商業利用本平台或其內容的任何權利。
      </p>

      <h3>七、使用限制</h3>
      <p>您不得：</p>
      <ul>
        <li>將本平台用於任何非法目的或違反適用法律法規的行為。</li>
        <li>對本平台進行逆向工程、反編譯、拆解或嘗試取得原始碼。</li>
        <li>在未獲得事先書面同意的情況下，使用自動化工具爬取或擷取本平台資料。</li>
        <li>冒充任何個人或實體，或虛偽陳述您與任何個人或實體的關係。</li>
        <li>發布虛假、誤導性、誹謗性或詐欺性的內容或評論。</li>
        <li>騷擾、威脅或傷害其他使用者或設計師。</li>
        <li>規避本平台的任何安全功能或付款機制。</li>
        <li>利用本平台招攬平台外預約或付款，以繞過 VAVA 的系統。</li>
      </ul>

      <h3>八、預約與媒合機制</h3>
      <p>
        顧客提交預約需求，指定服務類型、希望的日期、時間及地點。
        本平台將需求廣播給該地區的可用設計師。預約以先接受者優先的方式確認。
        一旦確認，雙方均會收到通知，預約細節即告鎖定。
        VAVA 不保證特定設計師或時段的可用性。
      </p>

      <h3>九、先接受確認機制</h3>
      <p>
        第一位接受顧客需求的可用設計師即確認該預約。確認後，其他設計師不得主張同一預約。
        顧客承認此機制可能導致由 VAVA 可用設計師中的任一位接受預約，並透過提交需求表示同意此流程。
      </p>

      <h3>十、設計師獨立性</h3>
      <p>
        本平台上的設計師為獨立承攬人，並非 VAVA 的員工、代理人或合夥人。
        VAVA 不控制設計師執行服務的方式、工具、技術、產品或專業決策。
        設計師給予的任何專業建議、推薦或採取的行動均為其本身的責任。
        VAVA 對設計師提供之服務的品質、安全性或結果不負任何責任。
      </p>

      <h3>十一、顧客責任</h3>
      <ul>
        <li>準時到達約定地點並做好服務準備。</li>
        <li>在預約時或預約前提供準確的服務需求、偏好及相關健康或過敏資訊。</li>
        <li>尊重設計師。騷擾、辱罵或不當行為將導致帳戶停權。</li>
        <li>確保服務環境（如為到府服務）安全、無障礙且適合所請求的服務。</li>
        <li>透過本平台按約定付款。本平台不支持或認可平台外的現金付款。</li>
      </ul>

      <h3>十二、設計師責任</h3>
      <ul>
        <li>提供準確的個人資料、服務項目、定價、可用時段及作品集圖片。</li>
        <li>準時到達並備齊所有必要的工具、產品及衛生用品。</li>
        <li>依據適用專業法規維持衛生、消毒及安全標準。</li>
        <li>及時與顧客溝通任何變更、延誤或問題。</li>
        <li>不得向顧客要求或接受針對 VAVA 預約的平台外付款。</li>
        <li>依服務地區之法律規定持有必要的專業執照或認證。</li>
      </ul>

      <h3>十三、定價、費用與付款</h3>
      <p>
        服務價格由各設計師自行設定，並於預約時顯示於本平台。
        VAVA 可能收取平台服務費，並於確認預約前揭露。
        所有付款均透過本平台指定的支付服務商處理。完成預約即表示您授權 VAVA 向您選定的付款方式收取相應費用。
        VAVA 保留在通知使用者後調整費用結構的權利。
      </p>

      <h3>十四、應用程式商店及第三方付款規則</h3>
      <p>
        VAVA 應用程式透過 Apple App Store 及 Google Play Store 發布。
        應用程式內購買及訂閱受適用的 App Store 或 Google Play 條款及政策（包括計費、退款及訂閱管理相關規定）約束。
        Apple 及 Google 並非本條款的當事方，且對本平台服務不承擔任何責任。
        與 App Store 或 Play Store 購買相關的任何帳單問題，須分別向 Apple 或 Google 反映。
      </p>

      <h3>十五、取消政策</h3>
      <p>
        顧客可在預約服務時間前至少 <strong>2 小時</strong>免費取消已確認的預約。
        在預約時間前 2 小時內取消可能產生取消費用。
        無正當理由取消已確認預約的設計師可能受到帳戶懲處。
        VAVA 保留更新取消時限及費用的權利，並將通知使用者相關變更。
      </p>

      <h3>十六、未出席與遲到</h3>
      <p>
        若顧客未事先取消且未出現於已確認預約（「未出席」），
        該預約可能被全額收費，且不予退款。
        若顧客遲到超過 15 分鐘，設計師可自行決定調整服務範圍，或將該預約視為未出席。
        多次未出席可能導致帳戶停權。
      </p>

      <h3>十七、退款</h3>
      <p>
        退款將依個案評估。以下情形可能獲得退款：(a) 設計師取消已確認的預約；
        (b) 因設計師可歸責之原因導致服務未能執行；或 (c) 發生技術性帳單錯誤。
        僅因對服務品質不滿意而不予退款，因設計師為獨立承攬人。
        退款申請須於服務時間後 72 小時內透過 <a href="mailto:hello@vava.now">hello@vava.now</a> 提出。
      </p>

      <h3>十八、消費者保護與七日鑑賞期</h3>
      <p>
        依據台灣《消費者保護法》，透過通訊交易（包括應用程式內購買）購買服務的消費者，
        享有自收受商品或服務後 <strong>七日</strong>內無須說明理由解除契約之權利（「七日鑑賞期」）。
        此權利適用於在本平台購買的預付點數、訂閱方案或服務套餐，惟以法律允許之範圍為限。
        此權利不適用於已履行的個別美業服務預約或已全部消費的數位商品。
        如需行使此權利，請於七日期限內聯絡 <a href="mailto:hello@vava.now">hello@vava.now</a>。
      </p>

      <h3>十九、服務品質、安全、過敏與效果</h3>
      <p>
        VAVA 不保證美業服務的特定效果或結果。顧客有責任在服務開始前向設計師告知任何已知的過敏症、
        皮膚敏感、醫療狀況或禁忌症。
        VAVA 對因未揭露相關資訊或美容療程本質所造成的不良反應、傷害或不滿不負任何責任。
        若您出現不良反應，請立即尋求適當的醫療協助。
      </p>

      <h3>二十、使用者內容</h3>
      <p>
        您保留您提交至本平台的內容的所有權。透過提交內容，您授予 VAVA 全球性、免版稅、非獨家的授權，
        以使用、重製、修改及展示相關內容，以便營運及推廣本平台。
        您聲明您擁有授予此授權所需的一切權利。
        VAVA 可移除任何違反本條款或適用法律的內容。
      </p>

      <h3>二十一、評論與評分</h3>
      <p>
        完成預約後，顧客和設計師均可留下真實的評論與評分。
        評論必須真誠，並基於實際體驗。VAVA 禁止虛假、受利益誘導或報復性的評論。
        VAVA 保留移除違反本條款的評論的權利。
        評論移除申請可提交至 <a href="mailto:hello@vava.now">hello@vava.now</a>。
      </p>

      <h3>二十二、個人資料與隱私</h3>
      <p>
        您使用本平台亦受我們的<a href="/privacy">隱私權政策</a>約束，該政策以引用方式納入本條款。
        使用本平台即表示您同意依該政策收集及使用您的資訊。
      </p>

      <h3>二十三、通訊與通知</h3>
      <p>
        建立帳戶即表示您同意透過推播通知、電子郵件或簡訊接收交易性通知（預約確認、提醒及取消通知）。
        您可隨時透過帳戶設定取消訂閱行銷通訊。
        取消訂閱交易性通知可能影響平台功能的使用。
      </p>

      <h3>二十四、第三方服務與連結</h3>
      <p>
        本平台可能包含連結至第三方服務（如支付處理商、地圖服務供應商、社群登入服務提供商）或與其整合。
        VAVA 對任何第三方服務的內容、隱私實踐或可靠性不負任何責任。
        使用第三方服務受其各自條款約束。
      </p>

      <h3>二十五、平台可用性</h3>
      <p>
        VAVA 致力維持平台可用性，但不保證不中斷或無錯誤的服務。
        本平台可能因維護、更新或超出我們控制範圍的情況而暫時無法使用。
        VAVA 對因平台停機或不可用而造成的任何損失或不便不負任何責任。
      </p>

      <h3>二十六、智慧財產權</h3>
      <p>
        本平台的所有內容、功能、設計、標誌、商標及軟體均為 VAVA 或其授權方的專有財產，
        並受適用的智慧財產權法律保護。
        本條款未授予您超出此處所述有限授權之 VAVA 智慧財產的任何權利、所有權或利益。
        未經授權使用 VAVA 智慧財產嚴格禁止。
      </p>

      <h3>二十七、促銷活動、點數與折扣</h3>
      <p>
        VAVA 可能不時提供促銷點數、折扣碼或推薦獎勵。
        這些不可轉讓、無現金價值、不得與其他優惠合併使用（除非另有說明），且可能有有效期限。
        VAVA 保留隨時修改或終止促銷活動的權利。
        透過詐欺或濫用方式獲得的點數將予以沒收。
      </p>

      <h3>二十八、帳戶停權與終止</h3>
      <p>
        若您違反本條款、從事詐欺行為、對其他使用者構成安全風險，或基於 VAVA 自行裁量的任何其他原因，
        VAVA 可隨時停用或終止您的帳戶。
        帳戶終止後，您使用本平台的授權立即停止。
        您可透過聯絡 <a href="mailto:hello@vava.now">hello@vava.now</a> 申請刪除帳戶。
        終止不影響終止前已產生的任何權利或義務。
      </p>

      <h3>二十九、免責聲明</h3>
      <p>
        本平台及所有服務「依現狀」及「依可用性」提供，不附任何形式的明示或默示擔保，
        包括但不限於適售性、特定目的適用性或不侵權之擔保。
        VAVA 不保證本平台無錯誤、安全或不中斷。
      </p>

      <h3>三十、責任限制</h3>
      <p>
        在適用法律允許的最大範圍內，VAVA 對因您使用本平台或任何預約而產生或與之相關的任何間接、
        附帶、特殊、衍生性或懲罰性損害（包括利潤損失、資料損失或商譽損失）不負任何責任，
        無論其基礎為合約、侵權行為、法規或其他。
        在任何情況下，VAVA 對您的累計總責任不超過您在索賠前 3 個月內向 VAVA 支付的金額，
        或新台幣 3,000 元（三千元整），以較高者為準。
      </p>

      <h3>三十一、賠償</h3>
      <p>
        您同意就以下情形對 VAVA 及其關係企業、董事、員工及代理人進行抗辯、賠償並使其免受損害，
        包括因此產生的合理法律費用：(a) 您使用本平台；(b) 您違反本條款；
        (c) 您提交的內容；或 (d) 您違反任何適用法律或任何第三方的權利。
      </p>

      <h3>三十二、爭議解決與客戶服務</h3>
      <p>
        若您有任何爭議或投訴，請先聯絡我們的客戶服務團隊：<a href="mailto:hello@vava.now">hello@vava.now</a>。
        我們將致力於在 14 個工作天內友好解決爭議。
        若無法透過直接協商解決爭議，雙方同意在提起正式法律訴訟前先嘗試調解。
      </p>

      <h3>三十三、準據法與管轄法院</h3>
      <p>
        本條款依中華民國（台灣）法律解釋並受其約束。
        因本條款產生或與之相關的任何爭議，以台灣台北地方法院為第一審管轄法院，
        但您所在司法管轄區之強制性消費者保護法律另有規定者除外。
      </p>

      <h3>三十四、條款變更</h3>
      <p>
        VAVA 可隨時更新本條款。若有重大變更，我們將在變更生效前至少 7 天透過本平台、
        電子郵件或推播通知告知您。
        生效日期後持續使用本平台即表示接受更新後的條款。
        若您不同意，必須在生效日期前停止使用本平台。
      </p>

      <h3>三十五、電子文件</h3>
      <p>
        本條款構成台灣《電子簽章法》意義下的電子文件。
        透過電子方式接受本條款，即表示您同意電子接受與書面簽名具有相同的法律效力。
      </p>

      <h3>三十六、語言</h3>
      <p>
        本條款以英文及繁體中文提供。若兩個版本之間存在任何不一致之處，
        對台灣地區使用者，以繁體中文版本為準；在其他司法管轄區，以英文版本為準。
      </p>

      <h3>三十七、條款可分性</h3>
      <p>
        若本條款的任何條文被認定無效、不合法或不可執行，其餘條文應繼續完全有效。
        無效條文應進行最小限度的修改，使其具有可執行性。
      </p>

      <h3>三十八、完整協議</h3>
      <p>
        本條款連同<a href="/privacy">隱私權政策</a>及以引用方式納入的任何其他政策或指引，
        構成您與 VAVA 就使用本平台的完整協議，並取代所有先前的協議、陳述或諒解。
      </p>

      <h3>三十九、聯絡我們</h3>
      <p>
        如對本條款有任何疑問、投訴或申請，請透過以下方式聯絡我們：
        <a href="mailto:hello@vava.now">hello@vava.now</a>
      </p>
    </main>
  )
}
