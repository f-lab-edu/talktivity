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
        <h2>1. 서비스 소개</h2>
        <p>
          톡티비티는 이용자가 입력한 카카오톡 대화를 AI로 분석해 말투와 대화 패턴을 보여주는 대화
          분석·코칭 도구입니다. 분석 결과는 참고용이며 정확성이나 특정 결과를 보장하지 않습니다.
        </p>
      </section>
      <section>
        <h2>2. 이용자의 책임</h2>
        <p>
          이용자는 대화 상대방의 메시지를 포함한 내용을 입력할 정당한 권리가 있어야 하며, 그에 따른
          책임은 이용자에게 있습니다. 타인의 권리를 침해하거나 법령에 어긋나는 용도로 서비스를
          이용할 수 없습니다.
        </p>
      </section>
      <section>
        <h2>3. 크레딧과 유료 리포트</h2>
        <p>
          유료 리포트는 크레딧을 사용해 생성하며, 크레딧은 결제 또는 쿠폰으로 얻을 수 있습니다.
          리포트 1건당 크레딧 1개가 사용됩니다. 환불 기준은 <Link href="/refund">환불정책</Link>을
          따릅니다.
        </p>
      </section>
      <section>
        <h2>4. 결제 및 판매자</h2>
        <p>
          결제는 Paddle.com이 Merchant of Record(판매자)로서 처리하며, 결제창 제공, 청구서 발행,
          세금 처리를 담당합니다.
        </p>
      </section>
      <section>
        <h2>5. 면책</h2>
        <p>
          서비스는 있는 그대로 제공되며, 분석 결과를 근거로 한 이용자의 판단과 결정에 대해 책임을
          지지 않습니다. 외부 서비스 장애 등 불가피한 사유로 서비스가 일시 중단될 수 있습니다.
        </p>
      </section>
      <section>
        <h2>6. 문의</h2>
        <p>
          톡티비티 운영팀: <a href="mailto:hhmmmteam@gmail.com">hhmmmteam@gmail.com</a>
        </p>
      </section>
      <section>
        <h2>7. 시행일</h2>
        <p>이 약관은 2026-11-21부터 시행합니다.</p>
      </section>
    </article>
  );
}
