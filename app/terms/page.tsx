import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 | 톡티비티",
  description: "톡티비티 서비스 이용 조건, 크레딧·결제, 면책 안내",
};

export default function TermsPage() {
  return (
    <article className="legal-page">
      <h1>이용약관</h1>
      <p className="legal-date">시행일: 2026-11-21</p>
      <section>
        <h2>제1조(목적)</h2>
        <p>
          이 약관은 문성재(Moon Sungjae)(이하 &ldquo;판매자&rdquo;)가 제공하는 톡티비티 서비스의
          이용과 관련하여 판매자와 이용자 사이의 권리, 의무 및 책임사항, 그 밖에 필요한 사항을
          정함을 목적으로 합니다.
        </p>
      </section>
      <section>
        <h2>제2조(정의)</h2>
        <ul>
          <li>
            &ldquo;서비스&rdquo;란 판매자가 제공하는, 이용자가 입력한 대화를 AI로 분석해 말투와 대화
            패턴을 보여주는 대화 분석·코칭 도구를 말합니다.
          </li>
          <li>&ldquo;이용자&rdquo;란 이 약관에 따라 서비스를 이용하는 모든 사람을 말합니다.</li>
          <li>
            &ldquo;크레딧&rdquo;이란 유료 리포트를 생성하는 데 사용하는, 결제 또는 쿠폰으로 얻는
            이용 단위를 말합니다.
          </li>
          <li>
            &ldquo;유료 리포트&rdquo;란 크레딧을 사용해 생성·저장되는 상세 분석 결과와 맞춤 답장
            추천을 말합니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>제3조(판매자 정보 및 약관의 명시·효력·변경)</h2>
        <ul>
          <li>
            판매자: 문성재(Moon Sungjae) (개인), 연락처:{" "}
            <a href="mailto:hhmmmteam@gmail.com">hhmmmteam@gmail.com</a>. 판매자의 주소는 이용자가
            요청하면 이메일로 알려드립니다.
          </li>
          <li>
            판매자는 이 약관의 내용을 이용자가 알 수 있도록 서비스의 약관 페이지에 게시합니다.
          </li>
          <li>이용자가 서비스를 이용하면 이 약관에 동의한 것으로 봅니다.</li>
          <li>
            판매자는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 시행일과
            변경 내용을 시행일 전에 이 페이지에 공지합니다. 이용자가 변경 후에도 서비스를 계속
            이용하면 변경된 약관에 동의한 것으로 봅니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>제4조(서비스의 내용)</h2>
        <ul>
          <li>
            서비스는 이용자가 입력한 대화를 AI로 분석해 말투와 대화 패턴을 보여주는 대화 분석·코칭
            도구입니다.
          </li>
          <li>분석 결과는 참고용이며 정확성이나 특정 결과를 보장하지 않습니다.</li>
          <li>
            무료 분석과 크레딧을 사용하는 유료 리포트로 구성되며, 판매자는 서비스의 구성을 바꿀 수
            있습니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>제5조(크레딧·유료 리포트와 결제)</h2>
        <ul>
          <li>
            유료 리포트는 크레딧을 사용해 생성하며, 리포트 1건당 크레딧 1개가 사용됩니다. 크레딧은
            생성된 리포트가 저장될 때에만 차감되고, 생성에 실패하면 차감되지 않습니다.
          </li>
          <li>
            주문 절차는 온라인 재판매자(reseller)인 Paddle.com이 수행하며, Paddle.com이 모든 주문의
            판매기록자(Merchant of Record)입니다.
          </li>
          <li>
            결제, 청구, 세금 처리는 Paddle의 구매자 약관(
            <a
              href="https://www.paddle.com/legal/checkout-buyer-terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Paddle Checkout Buyer Terms
            </a>
            )에 따릅니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>제6조(청약철회)</h2>
        <ul>
          <li>
            청약철회와 환불의 기준과 방법은 <Link href="/refund">환불정책</Link>에 따릅니다.
          </li>
          <li>
            리포트 생성에 사용한 크레딧은 디지털콘텐츠의 제공이 개시된 것이므로 「전자상거래
            등에서의 소비자보호에 관한 법률」에 따라 청약철회가 제한될 수 있으며, 결제 전에 이를
            고지합니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>제7조(이용자의 의무와 금지행위)</h2>
        <ul>
          <li>
            이용자는 다음 행위를 해서는 안 됩니다.
            <ul>
              <li>불법적인 목적의 이용, 사기·스팸 행위</li>
              <li>타인의 권리와 지식재산권을 침해하는 행위</li>
              <li>보안 침해, 악성코드 유포, 스크래핑 및 자동화 수단을 이용한 서비스 남용</li>
              <li>대화에 포함된 상대방 등 타인의 대화를 정당한 권리 없이 입력하는 행위</li>
            </ul>
          </li>
        </ul>
      </section>
      <section>
        <h2>제8조(생성형 AI 이용)</h2>
        <ul>
          <li>입력한 내용에 대한 권리와 책임은 이용자에게 있습니다.</li>
          <li>
            AI 출력은 부정확하거나 부적절할 수 있으며, 의료·법률·심리 등 전문 상담을 대체하지
            않습니다.
          </li>
          <li>
            괴롭힘, 혐오, 기만, 타인의 개인정보 폭로 등의 용도로 서비스와 출력을 사용할 수 없습니다.
          </li>
          <li>
            권리 침해 신고는 <a href="mailto:hhmmmteam@gmail.com">hhmmmteam@gmail.com</a>로
            접수하며, 확인 후 필요한 조치를 합니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>제9조(지식재산권)</h2>
        <ul>
          <li>
            서비스와 그에 포함된 소프트웨어, 디자인, 문구 등의 지식재산권은 판매자에게 있습니다.
          </li>
          <li>
            이용자가 입력한 내용에 대한 권리는 이용자에게 있으며, 판매자는 서비스 제공에 필요한
            범위에서만 이를 처리합니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>제10조(서비스의 변경·중단)</h2>
        <ul>
          <li>판매자는 운영상·기술상 필요에 따라 서비스를 변경하거나 중단할 수 있습니다.</li>
          <li>
            서비스는 무중단·무오류를 보장하지 않으며, 외부 서비스 장애 등으로 일시 중단될 수
            있습니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>제11조(이용 제한 및 계약 해지)</h2>
        <p>
          판매자는 이용자가 이 약관을 중대하게 위반하거나, 부정 결제를 하거나, 서비스의 보안·사기
          위험을 일으키는 경우 사전 통지 후 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.
          긴급한 위험이 있으면 먼저 제한하고 사후에 알립니다.
        </p>
      </section>
      <section>
        <h2>제12조(면책)</h2>
        <ul>
          <li>
            서비스는 있는 그대로 제공되며, 분석 결과를 근거로 한 이용자의 판단과 결정에 대해
            판매자는 책임을 지지 않습니다.
          </li>
          <li>
            판매자는 천재지변, 외부 서비스 장애 등 불가항력으로 인한 손해에 대해 책임을 지지
            않습니다. 다만 판매자의 고의 또는 과실로 인한 손해는 관련 법령에 따릅니다.
          </li>
        </ul>
      </section>
      <section>
        <h2>제13조(분쟁 해결 및 준거법)</h2>
        <p>이 약관과 서비스 이용에 관한 분쟁에는 대한민국 법을 적용합니다.</p>
      </section>
      <section>
        <h2>제14조(문의)</h2>
        <p>
          문의: <a href="mailto:hhmmmteam@gmail.com">hhmmmteam@gmail.com</a>
        </p>
      </section>
      <section>
        <h2>부칙</h2>
        <p>이 약관은 2026-11-21부터 시행합니다.</p>
      </section>
    </article>
  );
}
