
// 70개 기본 종목 - 6개 섹터
export const DEFAULT_SECTORS = [
    {
        id: 'semiconductor',
        name: '🔬 반도체',
        order: 1,
        stocks: [
            { code: '005930', name: '삼성전자' },
            { code: '005935', name: '삼성전자우' },
            { code: '000660', name: 'SK하이닉스' },
            { code: '232140', name: '와이씨' },
            { code: '403870', name: 'HPSP' },
            { code: '089030', name: '테크윙' },
            { code: '166090', name: '하나머티리얼즈' },
            { code: '067310', name: '하나마이크론' },
            { code: '084370', name: '유진테크' },
            { code: '031980', name: '피에스케이홀딩스' },
            { code: '319660', name: '피에스케이' },
            { code: '039440', name: '에스티아이(STI)' },
            { code: '003160', name: '디아이(DI)' },
            { code: '101490', name: '에스앤에스텍' },
            { code: '039030', name: '이오테크닉스' },
            { code: '240810', name: '원익IPS' },
            { code: '095340', name: 'ISC' },
            { code: '131970', name: '두산테스나' },
            { code: '036810', name: '에프에스티' },
            { code: '489790', name: '한화비전' },
            { code: '399720', name: '가온칩스' },
            { code: '158430', name: '에이디테크놀로지' },
            { code: '036930', name: '주성엔지니어링' },
            { code: '042700', name: '한미반도체' },
            { code: '281820', name: '케이씨텍' },
            { code: '074600', name: '원익QnC' },
            { code: '036200', name: '유니샘' },
            { code: '064760', name: '티씨케이' },
        ]
    },
    {
        id: 'battery',
        name: '🔋 이차전지',
        order: 2,
        stocks: [
            { code: '006400', name: '삼성SDI' },
            { code: '373220', name: 'LG에너지솔루션' },
            { code: '051910', name: 'LG화학' },
            { code: '005490', name: 'POSCO홀딩스' },
            { code: '086520', name: '에코프로' },
            { code: '247540', name: '에코프로비엠' },
            { code: '066970', name: '엘앤에프' },
            { code: '003670', name: '포스코퓨처엠' },
            { code: '121600', name: '나노신소재' },
            { code: '450080', name: '에코프로머티' },
            { code: '091580', name: '상신이디피' },
            { code: '005420', name: '코스모화학' },
        ]
    },
    {
        id: 'bio_health',
        name: '🧬 바이오 및 헬스케어',
        order: 3,
        stocks: [
            { code: '009420', name: '한올바이오파마' },
            { code: '950160', name: '코오롱티슈진' },
            { code: '128940', name: '한미약품' },
            { code: '028300', name: 'HLB' },
            { code: '298380', name: '에이비엘바이오' },
            { code: '389470', name: '인벤티지랩' },
            { code: '220100', name: '퓨쳐켐' },
            { code: '141080', name: '리가켐바이오' },
            { code: '196170', name: '알테오젠' },
            { code: '039200', name: '오스코텍' },
        ]
    },
    {
        id: 'auto_parts',
        name: '🚗 자동차 및 전자부품',
        order: 4,
        stocks: [
            { code: '005380', name: '현대차' },
            { code: '005385', name: '현대차우' },
            { code: '012330', name: '현대모비스' },
            { code: '000270', name: '기아' },
            { code: '009150', name: '삼성전기' },
            { code: '009155', name: '삼성전기우' },
        ]
    },
    {
        id: 'robot_energy',
        name: '🤖 로봇 및 에너지',
        order: 5,
        stocks: [
            { code: '277810', name: '레인보우로보틱스' },
            { code: '117730', name: '티로보틱스' },
            { code: '475400', name: '씨메스' },
            { code: '466100', name: '클로봇' },
            { code: '322000', name: 'HD현대에너지솔루션' },
            { code: '010060', name: 'OCI홀딩스' },
        ]
    },
    {
        id: 'entertainment',
        name: '🎵 엔터 및 플랫폼',
        order: 6,
        stocks: [
            { code: '352820', name: '하이브' },
            { code: '122870', name: '와이지엔터테인먼트' },
            { code: '035900', name: 'JYP Ent.' },
            { code: '041510', name: '에스엠' },
            { code: '002710', name: 'TCC스틸' },
            { code: '376300', name: '디어유' },
            { code: '035720', name: '카카오' },
            { code: '035420', name: 'NAVER' },
        ]
    },
    {
        id: 'finance',
        name: '🏦 기타(금융)',
        order: 7,
        stocks: [
            { code: '105560', name: 'KB금융' },
            { code: '055550', name: '신한지주' },
            { code: '086790', name: '하나금융지주' },
            { code: '032830', name: '삼성생명' },
            { code: '138040', name: '메리츠금융지주' },
            { code: '047050', name: '포스코인터내셔널' },
        ]
    },
];
