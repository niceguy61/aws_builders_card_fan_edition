import type { ComboDef } from '../game/cards';
import type { Locale } from '../i18n';

// 실물 카드 Effect Icons: 크레딧(주황 원) · 뽑기(다크 사각) · 도입(구름)
export function CreditIcon({ v }: { v: number }) {
  return <span className="efx efx-credit">{v}</span>;
}
export function DrawIcon({ v }: { v: number }) {
  return <span className="efx efx-draw">+{v}</span>;
}
export function AdoptIcon({ v }: { v: number }) {
  return (
    <span className="efx efx-adopt">
      <svg viewBox="0 0 24 16" width="18" height="12" aria-hidden="true">
        <path
          d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
          transform="translate(0,-5)"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      +{v}
    </span>
  );
}

export interface FxIcon {
  kind: 'credit' | 'draw' | 'adopt';
  value: number;
}

// 보너스 데이터 → 아이콘 (문구 파싱 없음, 번역표와 무관하게 동작)
export function effectFx(combo: ComboDef): FxIcon[] {
  switch (combo.bonusType) {
    case 'DRAW_CARD':
      return [{ kind: 'draw', value: combo.bonusValue ?? 1 }];
    case 'CREDIT':
      return [{ kind: 'credit', value: combo.bonusValue ?? 0 }];
    case 'CLOUD_ADOPT':
      return [{ kind: 'adopt', value: combo.bonusValue ?? 1 }];
    case 'CREDIT_PER_COMBINATION':
    case 'CREDIT_PER_COMPUTE_CONTAINER_CARD':
    case 'CREDIT_PER_OTHER_CARD':
      return [{ kind: 'credit', value: combo.bonusValue ?? 1 }];
    case 'CREDIT_AND_ADOPT':
      return [
        { kind: 'credit', value: combo.creditValue ?? 0 },
        { kind: 'adopt', value: combo.adoptValue ?? 0 },
      ];
    case 'DRAW_AND_ADOPT':
      return [
        { kind: 'draw', value: combo.drawValue ?? 0 },
        { kind: 'adopt', value: combo.adoptValue ?? 0 },
      ];
    default:
      return []; // WA_COST_DISCOUNT / RECOVER_TO_DECK_TOP — 텍스트형 효과
  }
}

const ALIAS: Record<string, string> = {
  AMAZON_EC2: 'EC2',
  AWS_EC2_AUTO_SCALING: 'Auto Scaling',
  AWS_LAMBDA: 'Lambda',
  AMAZON_S3: 'S3',
  AMAZON_DYNAMODB: 'DynamoDB',
  AMAZON_SQS: 'SQS',
  AMAZON_SNS: 'SNS',
  AWS_FARGATE: 'Fargate',
  AMAZON_ECS: 'ECS',
  AMAZON_EKS: 'EKS',
  AMAZON_EFS: 'EFS',
  AMAZON_API_GATEWAY: 'APIGW',
  AMAZON_VPC: 'VPC',
  ELASTIC_LOAD_BALANCING: 'ELB',
  AMAZON_CLOUDFRONT: 'CF',
  AMAZON_ROUTE53: 'Route53',
  AMAZON_REDSHIFT: 'Redshift',
  AMAZON_ATHENA: 'Athena',
  AMAZON_KINESIS_DATA_STREAMS: 'Kinesis',
  AMAZON_OPENSEARCH_SERVICE: 'OpenSearch',
  AMAZON_DATA_FIREHOSE: 'Firehose',
  AMAZON_ELASTICACHE: 'ElastiCache',
  AMAZON_RDS: 'RDS',
  AMAZON_AURORA: 'Aurora',
  AMAZON_CODECATALYST: 'CodeCatalyst',
  AMAZON_CLOUDWATCH: 'CloudWatch',
  AWS_CLOUDTRAIL: 'CloudTrail',
  AMAZON_EVENTBRIDGE: 'EventBridge',
  AWS_STEP_FUNCTIONS: 'Step Functions',
  AWS_MARKETPLACE: 'Marketplace',
  ONPREM_VM: 'VM',
  ONPREM_BARE_METAL: 'Bare Metal',
};

function alias(id: string, locale: Locale): string {
  if (id === 'ONPREM_ID_PROVIDER') return locale === 'ko' ? '사내 IdP' : 'Corporate IdP';
  return ALIAS[id] ?? id;
}

// 아이콘 뒤에 붙는 조건 문구 (실물의 "when combined with X")
export function effectCond(combo: ComboDef, locale: Locale): string {
  const isPer =
    combo.bonusType === 'CREDIT_PER_COMBINATION' ||
    combo.bonusType === 'CREDIT_PER_COMPUTE_CONTAINER_CARD' ||
    combo.bonusType === 'CREDIT_PER_OTHER_CARD' ||
    combo.targetCardId === 'AMAZON_SQS'; // SNS: SQS당 (DRAW지만 per-unit)
  const two = combo.condition === 'REQUIRES_TWO_CARDS';
  let target = '';
  if (combo.targetCardId) {
    const ids = Array.isArray(combo.targetCardId) ? combo.targetCardId : [combo.targetCardId];
    target = ids.map((id) => alias(id as string, locale)).join('/');
  } else if (combo.targetCategory) {
    target = locale === 'ko' ? '컴퓨트/컨테이너' : 'compute/containers';
    if (two) target = locale === 'ko' ? '컴퓨트 2장' : '2 compute';
  } else if (combo.targetAnyOtherService) {
    target = locale === 'ko' ? '다른 서비스' : 'any other service';
  } else {
    return '';
  }
  if (isPer) return locale === 'ko' ? `${target}당` : `per ${target}`;
  return locale === 'ko' ? `${target} 조합 시` : `with ${target}`;
}
