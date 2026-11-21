import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 톡티비티",
  description: "톡티비티의 개인정보 수집·이용, 처리 위탁 및 국외 이전, 이용자 권리 안내",
};

export default function PrivacyPage() {
  return (
    <article className="legal-page">
      <h1>개인정보처리방침</h1>
      <p className="legal-date">시행일: 2026-11-21</p>
      <section>
        <h2>1. 수집하는 개인정보 항목 및 목적</h2>
        <ul>
          <li>카카오 로그인: 카카오 고유 ID, 닉네임</li>
          <li>구글 로그인: 이메일, 이름, 닉네임</li>
          <li>
            서비스 이용 기록: 크레딧 증감 내역(사유·거래 식별값), 쿠폰 사용 내역, 생성된 리포트 내용
          </li>
          <li>행동 분석 이벤트: 서비스 이용 이벤트와 IP 주소 등 접속 정보(PostHog)</li>
          <li>요청 제한을 위한 IP 주소(Upstash Redis)</li>
        </ul>
        <p>
          수집 목적은 회원 식별과 로그인, 크레딧·결제 관리, 유료 리포트 제공, 부정 이용 방지, 서비스
          개선입니다.
        </p>
      </section>
      <section>
        <h2>2. 대화 원문 및 캡처 이미지</h2>
        <p>
          분석을 위해 입력한 대화 텍스트와 캡처 이미지는 서버에 저장하지 않으며, 로그에도 남기지
          않습니다. 분석 요청 시 전화번호·이메일·URL·계좌번호로 보이는 숫자열은 마스킹하고 대화 상대
          이름은 &lsquo;나&rsquo;/&lsquo;상대&rsquo;로 바꿔 AI 처리 업체에 전달합니다. 유료 리포트를
          생성하면 그 결과(분석 내용)는 계정에 저장됩니다.
        </p>
      </section>
      <section>
        <h2>3. 보유 및 이용 기간</h2>
        <ul>
          <li>
            계정 및 리포트 정보: 삭제 요청 시까지 보관하고, 요청을 확인하면 지체 없이 삭제합니다.
          </li>
          <li>
            계약·청약철회·대금결제에 관한 기록: 전자상거래 등에서의 소비자보호에 관한 법률에 따라
            5년간 보관합니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>4. 처리 위탁 및 국외 이전</h2>
        <p>
          서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하거나 국외로 이전합니다. 이용자는 국외
          이전을 거부할 수 있으나, 이 경우 해당 기능(로그인·결제·분석 등) 이용이 제한될 수 있습니다.
        </p>
        <div className="legal-table-wrap">
          <table>
            <thead>
              <tr>
                <th>수탁자/이전받는 자</th>
                <th>국가</th>
                <th>항목</th>
                <th>목적</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Supabase</td>
                <td>대한민국(서울 리전)</td>
                <td>계정 정보, 크레딧 내역, 리포트</td>
                <td>인증 및 데이터 저장</td>
              </tr>
              <tr>
                <td>Anthropic 등 AI 모델 제공사(운영 설정에 따라 OpenAI, Google 등)</td>
                <td>미국</td>
                <td>마스킹된 대화 텍스트, 캡처 이미지</td>
                <td>대화 분석·리포트 생성</td>
              </tr>
              <tr>
                <td>Paddle.com(Merchant of Record)</td>
                <td>영국 및 결제 처리 국가</td>
                <td>결제 정보, 이메일, 거래 내역</td>
                <td>결제, 청구서 발행, 세금 처리</td>
              </tr>
              <tr>
                <td>PostHog</td>
                <td>미국</td>
                <td>행동 이벤트, IP 주소</td>
                <td>서비스 이용 분석</td>
              </tr>
              <tr>
                <td>Upstash</td>
                <td>미국 등 클라우드 리전</td>
                <td>IP 주소</td>
                <td>요청 횟수 제한(Redis)</td>
              </tr>
              <tr>
                <td>Vercel</td>
                <td>미국 등 글로벌 리전</td>
                <td>접속 정보, 요청 데이터</td>
                <td>서비스 호스팅</td>
              </tr>
              <tr>
                <td>Kakao</td>
                <td>대한민국</td>
                <td>로그인 인증 정보, 공유 요청</td>
                <td>카카오 로그인·공유</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>5. 이용자의 권리</h2>
        <p>
          이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제를 요청할 수 있습니다. 현재 앱 내
          회원 탈퇴 기능은 제공하지 않으며, 아래 이메일로 요청하시면 본인 확인 후 처리합니다.
        </p>
      </section>
      <section>
        <h2>6. 개인정보 보호책임자</h2>
        <ul>
          <li>책임자: 톡티비티 운영팀</li>
          <li>
            문의: <a href="mailto:hhmmmteam@gmail.com">hhmmmteam@gmail.com</a>
          </li>
        </ul>
      </section>
      <section>
        <h2>7. 방침 변경</h2>
        <p>이 방침이 변경되면 시행일과 함께 이 페이지에 공지합니다.</p>
      </section>
    </article>
  );
}
