import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 톡티비티",
  description: "톡티비티의 개인정보 처리 목적·항목·기간, 위탁 및 국외 이전, 정보주체 권리 안내",
};

export default function PrivacyPage() {
  return (
    <article className="legal-page">
      <h1>개인정보처리방침</h1>
      <p className="legal-date">시행일: 2026-11-21</p>
      <section>
        <h2>1. 개인정보의 처리 목적 및 법적 근거</h2>
        <ul>
          <li>회원 식별과 로그인: 계약 체결·이행</li>
          <li>크레딧·결제 관리와 유료 리포트 제공: 계약 이행</li>
          <li>
            대금 결제·청약철회 등 거래 기록 보관: 법령상 의무(전자상거래 등에서의 소비자보호에 관한
            법률)
          </li>
          <li>
            부정 이용 방지와 요청 제한: 개인정보처리자의 정당한 이익(개인정보 보호법 제15조 제1항
            제6호)
          </li>
          <li>
            서비스 이용 분석과 개선: 개인정보처리자의 정당한 이익(개인정보 보호법 제15조 제1항
            제6호)
          </li>
        </ul>
      </section>
      <section>
        <h2>2. 처리하는 개인정보 항목</h2>
        <ul>
          <li>카카오 로그인: 카카오 고유 ID, 닉네임</li>
          <li>구글 로그인: 이메일, 이름, 닉네임</li>
          <li>
            서비스 이용 기록: 크레딧 증감 내역(사유·거래 식별값), 쿠폰 사용 내역, 생성된 리포트 내용
          </li>
          <li>행동 분석 이벤트: 서비스 이용 이벤트와 IP 주소 등 접속 정보(PostHog)</li>
          <li>요청 제한을 위한 IP 주소(Upstash Redis)</li>
        </ul>{" "}
        <p>
          분석을 위해 입력한 대화 텍스트와 캡처 이미지는 서버에 저장하지 않으며 로그에도 남기지
          않습니다. 분석 요청 시 전화번호·이메일·URL·계좌번호로 보이는 숫자열은 마스킹하고 대화 상대
          이름은 &lsquo;나&rsquo;/&lsquo;상대&rsquo;로 바꿔 AI 처리 업체에 전달합니다. 유료 리포트를
          생성하면 그 결과(분석 내용)는 계정에 저장됩니다.
        </p>
      </section>
      <section>
        <h2>3. 개인정보의 처리 및 보유 기간</h2>
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
        <h2>4. 개인정보의 파기 절차 및 방법</h2>
        <ul>
          <li>
            파기 절차: 보유 기간이 끝나거나 삭제 요청을 확인하면 지체 없이 파기합니다. 법령에 따라
            보관해야 하는 정보는 별도로 분리해 보관한 뒤 기간이 끝나면 파기합니다.
          </li>
          <li>파기 방법: 전자적 파일은 복구할 수 없는 방법으로 영구 삭제합니다.</li>
        </ul>
      </section>
      <section>
        <h2>5. 개인정보의 제3자 제공</h2>
        <p>
          판매자는 개인정보를 제3자에게 제공하지 않습니다. 다만 결제는 Paddle.com이
          판매기록자(Merchant of Record)로서 결제 정보를 직접 수집·처리합니다.
        </p>
      </section>
      <section>
        <h2>6. 개인정보 처리 위탁 및 국외 이전</h2>
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
                <th>이전 시기·방법</th>
                <th>보유 기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Supabase</td>
                <td>대한민국(서울 리전)</td>
                <td>계정 정보, 크레딧 내역, 리포트</td>
                <td>인증 및 데이터 저장</td>
                <td>서비스 이용 시 네트워크 전송</td>
                <td>위탁 계약 종료 또는 삭제 요청 시까지</td>
              </tr>
              <tr>
                <td>Anthropic 등 AI 모델 제공사(운영 설정에 따라 OpenAI, Google 등)</td>
                <td>미국</td>
                <td>마스킹된 대화 텍스트, 캡처 이미지</td>
                <td>대화 분석·리포트 생성</td>
                <td>분석 요청 시 네트워크 전송</td>
                <td>분석 처리 후 제공사 정책에 따름</td>
              </tr>
              <tr>
                <td>Paddle.com(Merchant of Record)</td>
                <td>영국 및 결제 처리 국가</td>
                <td>결제 정보, 이메일, 거래 내역</td>
                <td>결제, 청구서 발행, 세금 처리</td>
                <td>결제 시 네트워크 전송</td>
                <td>관련 법령 및 Paddle 정책에 따름</td>
              </tr>
              <tr>
                <td>PostHog</td>
                <td>미국</td>
                <td>행동 이벤트, IP 주소</td>
                <td>서비스 이용 분석</td>
                <td>서비스 이용 시 네트워크 전송</td>
                <td>PostHog 보관 정책에 따름</td>
              </tr>
              <tr>
                <td>Upstash</td>
                <td>미국 등 클라우드 리전</td>
                <td>IP 주소</td>
                <td>요청 횟수 제한(Redis)</td>
                <td>요청 시 네트워크 전송</td>
                <td>요청 제한 기간 동안만</td>
              </tr>
              <tr>
                <td>Vercel</td>
                <td>미국 등 글로벌 리전</td>
                <td>접속 정보, 요청 데이터</td>
                <td>서비스 호스팅</td>
                <td>서비스 이용 시 네트워크 전송</td>
                <td>Vercel 보관 정책에 따름</td>
              </tr>
              <tr>
                <td>Kakao</td>
                <td>대한민국</td>
                <td>로그인 인증 정보, 공유 요청</td>
                <td>카카오 로그인·공유</td>
                <td>로그인·공유 시 네트워크 전송</td>
                <td>카카오 정책에 따름</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>7. 정보주체의 권리와 행사 방법</h2>
        <ul>
          <li>
            이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지를 요청할 수
            있습니다.
          </li>
          <li>
            현재 앱 내 회원 탈퇴 기능은 제공하지 않습니다.{" "}
            <a href="mailto:hhmmmteam@gmail.com">hhmmmteam@gmail.com</a>로 요청하시면 본인 확인 후
            처리합니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>8. 개인정보의 안전성 확보 조치</h2>
        <ul>
          <li>접근 권한 최소화: 데이터베이스는 서버에서만 접근합니다.</li>
          <li>전송 구간 암호화: HTTPS를 사용합니다.</li>
          <li>
            대화 원문과 캡처 이미지는 저장하지 않고, 분석 전에 개인정보로 보이는 값을 마스킹합니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>9. 자동 수집 장치(브라우저 저장소)의 설치·운영 및 거부</h2>
        <ul>
          <li>
            로컬 저장소(localStorage): 로그인 세션(인증 토큰), 입력 중인 대화 초안(이 기기의
            브라우저에만 저장), 내부 트래픽 구분 표시
          </li>
          <li>
            세션 저장소(sessionStorage): 분석 결과, 진행 단계, 결제 진행 상태, 마지막 분석
            요청(마스킹본). 탭을 닫으면 삭제됩니다.
          </li>
          <li>
            행동 분석(PostHog)은 메모리 저장 방식으로 동작해 브라우저에 식별자를 남기지 않으며,
            광고·추적 목적의 쿠키는 사용하지 않습니다.
          </li>
          <li>
            이용자는 브라우저 설정에서 저장소를 삭제하거나 차단할 수 있으나, 이 경우 로그인 유지 등
            일부 기능이 제한될 수 있습니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>10. 개인정보 처리자 및 보호책임자</h2>
        <ul>
          <li>개인정보처리자: 문성재(Moon Sungjae)</li>
          <li>보호책임자: 톡티비티 운영팀</li>
          <li>
            문의: <a href="mailto:hhmmmteam@gmail.com">hhmmmteam@gmail.com</a>
          </li>
        </ul>
      </section>
      <section>
        <h2>11. 권익침해 구제방법</h2>
        <ul>
          <li>개인정보침해신고센터: 118 (privacy.kisa.or.kr)</li>
          <li>개인정보분쟁조정위원회: 1833-6972 (kopico.go.kr)</li>
          <li>대검찰청: 1301 (spo.go.kr)</li>
          <li>경찰청: 182 (ecrm.police.go.kr)</li>
        </ul>
      </section>
      <section>
        <h2>12. 방침 변경</h2>
        <p>
          이 방침이 변경되면 시행일과 함께 이 페이지에 공지합니다. 이 방침은 2026-11-21부터
          시행합니다.
        </p>
      </section>
    </article>
  );
}
