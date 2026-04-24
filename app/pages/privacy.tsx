import { BackHeader, Layout, routePaths } from "@/components/layout";

type PrivacySection = {
  title: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
  listType?: "ordered" | "unordered";
};

const sections: readonly PrivacySection[] = [
  {
    title: "1. 運営者",
    listType: "unordered",
    items: [
      "運営者名: テスト対策プランナー",
      "メールアドレス: haibunnote.support@googlegroups.com",
      "お問い合わせフォーム: [GoogleフォームURL 要記入]",
      "備考: 本サービスで法令上表示が必要となる事業者情報がある場合は、本サービス上の別ページまたは適切な方法で表示します",
    ],
  },
  {
    title: "2. 取得する情報と取得方法",
    paragraphs: [
      "利用者が入力する情報",
    ],
    listType: "unordered",
    items: [
      "メールアドレス（ログインして利用する場合、またはお問い合わせフォームを使用する場合に取得します）",
      "学習データ（テスト名・日程・教科・目標点数・勉強時間配分）",
      "メモ欄など自由記述がある場合は、自分や他人の個人情報・要配慮情報を書き込まないでください。",
      "お問い合わせ内容（お問い合わせフォームまたはメールを使用した場合に取得します）",
      "匿名で利用する場合、入力内容を利用者の端末の localStorage に保存します。この情報は運営者のサーバーには送信されません。",
      "アクセス日時、IPアドレス、利用環境（ブラウザ・OS等）、エラー情報は、本サービスのホスティング（Vercel）および認証・データベース（Supabase）により自動記録されることがあります。詳細は「6. 外部送信について」をご覧ください。",
      "なお、本サービスでは氏名・住所・学校名・成績順位・友人情報・保護者情報を、通常の入力項目として取得しません。これらの情報がサービス提供に必要となる機能を追加する場合は、本ポリシーを更新します。",
    ],
  },
  {
    title: "3. 利用目的",
    paragraphs: [
      "取得した情報は、次の目的のみに使用します。",
    ],
    listType: "unordered",
    items: [
      "ログイン機能の提供（認証）",
      "学習時間配分計画の保存・表示・編集・管理",
      "匿名利用時に端末内で入力内容を保持するため",
      "不具合対応・障害調査・セキュリティ対策・不正利用防止",
      "利用状況の確認・機能改善（統計的な分析に限ります）",
      "お問い合わせへの対応",
      "開示・訂正・削除・利用停止等の請求への対応",
      "法令に基づく対応",
    ],
  },
  {
    title: "4. 第三者提供",
    paragraphs: [
      "運営者は、法令で認められる場合を除き、取得した個人情報を本人の同意なく第三者に提供しません。",
    ],
  },
  {
    title: "5. 外部サービスへの委託",
    paragraphs: [
      "本サービスでは、以下の外部サービスを利用しています。",
    ],
    listType: "unordered",
    items: [
      "Supabase Inc. / 利用目的: 認証・データベース・データ保存 / 所在国: 米国（データ保存リージョン: [要確認]）",
      "Vercel Inc. / 利用目的: ホスティング・CDN / 所在国: 米国",
      "Google LLC / 利用目的: お問い合わせ受付（Google Forms・Google Groups） / 所在国: 米国",
      "保存先が日本国外の場合、利用者の情報が外国のサーバーで取り扱われます。各委託先のプライバシーポリシーは以下のとおりです。",
      "Supabase: https://supabase.com/privacy",
      "Vercel: https://vercel.com/legal/privacy-policy",
      "Google: https://policies.google.com/privacy",
    ],
  },
  {
    title: "6. 外部送信について",
    paragraphs: [
      "本サービスを利用すると、以下の情報が外部サービスに送信されることがあります（電気通信事業法の外部送信規律に基づく公表）。",
    ],
    listType: "unordered",
    items: [
      "Supabase Inc. / 送信される情報: メールアドレス・学習データ・アクセスログ / 利用目的: 認証・データ保存・障害対応",
      "Vercel Inc. / 送信される情報: IPアドレス・アクセスログ / 利用目的: ホスティング・CDN・障害対応",
      "Google LLC / 送信される情報: お問い合わせ内容・メールアドレス / 利用目的: 問い合わせ受付（Google Forms・Google Groups利用）",
      "実装確定後に使用するサービス（アクセス解析・エラー監視・Webフォント等）が追加される場合は、この一覧を更新します。",
    ],
  },
  {
    title: "7. localStorageとCookieの利用",
    paragraphs: [
      "localStorage: 匿名利用時に学習データを端末内に保存するために利用します。運営者サーバーへの送信は行いません。ブラウザの設定またはアカウントメニューの「この端末のデータを消す」から削除できます。",
      "Cookie: ログイン状態の維持・セッション管理・セキュリティ確保のために利用されることがあります。広告目的のCookieは使用しません。ブラウザの設定でCookieの利用を制限できますが、その場合ログイン機能が使えなくなることがあります。",
    ],
  },
  {
    title: "8. 保存期間と削除方法",
    listType: "unordered",
    items: [
      "匿名利用の学習データ / 保存場所: 端末の localStorage / 削除方法: アカウントメニュー「この端末のデータを消す」またはブラウザ設定",
      "ログインユーザーの学習データ / 保存場所: Supabaseサーバー / 削除方法: アカウントメニューから退会すると削除手続の対象になります",
      "メールアドレス（認証情報） / 保存場所: Supabaseサーバー / 削除方法: 退会時に削除手続の対象になります",
      "アクセスログ / 保存場所: ホスティング・認証基盤 / 削除方法: 各委託先のポリシーに従い一定期間後に自動削除",
      "お問い合わせ内容 / 保存場所: Google Forms・Google Groups / 削除方法: 対応完了後、運営者が適宜削除します",
      "退会後もバックアップ等に最大 [要記入] 日程度保持される場合があります。法令上の保存義務がある場合や不正利用対応に必要な場合は、削除までに時間をいただくことがあります。",
    ],
  },
  {
    title: "9. 安全管理措置",
    paragraphs: [
      "運営者は、個人情報の漏えい・滅失・改ざん・不正アクセスを防ぐため、以下の措置を講じます。",
    ],
    listType: "unordered",
    items: [
      "通信の暗号化（HTTPS）",
      "認証によるアクセス制御（ログインユーザーのデータは本人のみ参照可能）",
      "委託先（Supabase・Vercel）の安全管理措置の確認",
      "管理端末のセキュリティ管理",
      "漏えい等が発覚した場合は法令に従い対応します",
    ],
  },
  {
    title: "10. 未成年の利用について",
    paragraphs: [
      "本サービスは中高生を主な対象としています。18歳未満の方は、本ポリシーと利用規約を保護者と一緒に確認した上でご利用ください。特にアカウント登録やお問い合わせを行う際は、保護者の同意・確認をお願いします。",
      "保護者の方からの開示・削除・利用停止のご依頼も下記の連絡先にて受け付けます。",
    ],
  },
  {
    title: "11. 開示・訂正・削除・利用停止等の手続き",
    paragraphs: [
      "運営者が保有する個人情報について、本人または法定代理人から開示・訂正・追加・削除・利用停止・消去・第三者提供停止の請求があった場合は、以下の方法で対応します。",
    ],
    listType: "unordered",
    items: [
      "請求先: haibunnote.support@googlegroups.com またはお問い合わせフォーム",
      "受付方法: メールまたはフォームにて受付",
      "本人確認: ご本人であることを確認できる情報をご提示いただきます（登録メールアドレス等）",
      "本人確認に関する補足: 原則として登録メールアドレス等により確認を行い、通常、住所の提示は求めません。住所確認が必要となる特別な手続を採用する場合は、事前にその方法を明示します",
      "代理人請求: 法定代理人（保護者等）からの請求も受け付けます",
      "回答方法: メールにて回答します",
      "手数料: 無料",
      "回答期限: 合理的な期間内（通常2週間以内を目安）に対応します",
    ],
  },
  {
    title: "12. 苦情・相談の申出先",
    paragraphs: [
      "個人情報の取扱いに関する苦情・ご相談・ご質問は以下までご連絡ください。",
    ],
    listType: "unordered",
    items: [
      "メールアドレス: haibunnote.support@googlegroups.com",
      "お問い合わせフォーム: [GoogleフォームURL 要記入]",
    ],
  },
  {
    title: "13. プライバシーポリシーの変更",
    paragraphs: [
      "法令の改正や本サービスの内容変更等に応じて、本ポリシーを変更することがあります。重要な変更がある場合は、変更前に本サービス上でわかりやすく告知します。変更後のポリシーは掲載した時点または別途定める日から適用します。",
    ],
  },
  {
    title: "14. 制定日・改定日",
    listType: "unordered",
    items: [
      "制定日: [要記入]",
      "最終改定日: 2026年4月24日",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <Layout
      variant="legal"
      header={<BackHeader title="プライバシーポリシー" fallbackHref={routePaths.top()} />}
    >
      <article className="space-y-8 pb-10">
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">最終更新日: 2026年4月24日</p>
          <h1 className="text-2xl font-semibold text-foreground">プライバシーポリシー</h1>
          <p className="text-sm leading-7 text-foreground">
            テスト対策プランナー（愛称「テスプラ」。以下「本サービス」といいます。）は、利用者のみなさんの情報を大切に取り扱います。本サービスは中高生のみなさんの利用を想定しているため、できるだけわかりやすく説明します。
          </p>
        </section>

        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7 text-foreground">
                {paragraph}
              </p>
            ))}
            {section.items ? (
              section.listType === "ordered" ? (
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-foreground">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              ) : (
                <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-foreground">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )
            ) : null}
          </section>
        ))}
      </article>
    </Layout>
  );
}
