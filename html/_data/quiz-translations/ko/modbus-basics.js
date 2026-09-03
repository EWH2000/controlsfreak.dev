"use strict";

module.exports = {
    "dumb-on-purpose": {
        prompt: "Modbus 응답만으로는 레지스터가 0.1도 단위의 온도를 담는지, 여러 상태 비트를 묶은 워드인지 알 수 없습니다. 그 의미는 제조사 문서에만 있습니다.",
        explain: "Modbus는 의도적으로 단순합니다. 레지스터는 16비트일 뿐이며 프로토콜에는 단위, 스케일, 이름이 포함되지 않습니다. 디바이스 매뉴얼이 곧 데이터 해석 규칙이므로, 매뉴얼을 잃으면 의미 없는 데이터만 남습니다. (객체가 스스로를 설명하는 <a href=\"/education/bacnet-basics.html\">BACnet</a>과 정확히 반대입니다.)",
        learnMoreLabel: "Modbus 기초 — Modbus인 것과 아닌 것",
    },
    "server-never-initiates": {
        prompt: "시퀀스에서 Modbus 서버의 상태 비트가 바뀌는 순간을 감지해야 합니다. 클라이언트는 비트가 변경되었음을 어떻게 알 수 있습니까?",
        explain: "Modbus 서버는 통신을 먼저 시작하지 않습니다. 모든 통신은 클라이언트 요청으로 시작하고 서버가 응답한 뒤 다시 조용히 기다립니다. ‘참고로 방금 값이 바뀌었습니다’와 같은 비동기 알림은 없습니다. 시퀀스가 새 값을 얼마나 빨리 확인하느냐가 중요하다면 클라이언트가 변화를 포착할 만큼 자주 폴링해야 합니다. (Change-of-Value 푸시는 Modbus가 아니라 BACnet의 기능입니다.)",
        learnMoreLabel: "Modbus 기초 — 클라이언트와 서버",
        choices: {
            "a": "값이 바뀌면 서버가 알림을 푸시합니다.",
            "b": "클라이언트가 한 번 구독하면 서버가 변경 사항을 보고합니다.",
            "c": "클라이언트가 변화를 포착할 만큼 빠르게 폴링해야 합니다.",
            "d": "서버가 버스에서 인터럽트를 발생시킵니다.",
        },
    },
    "rtu-vs-tcp-crc": {
        prompt: "TCP가 이미 오류 검출을 처리하므로 Modbus TCP는 Modbus RTU가 모든 프레임 끝에 붙이는 2바이트 CRC를 사용하지 않습니다.",
        explain: "기능 코드와 데이터 모델은 같고 메시지를 감싸는 방식만 달라집니다. Modbus RTU는 시리얼 선로의 오류를 검출하기 위해 2바이트 CRC를 붙입니다. Modbus TCP는 동일한 기능 코드와 데이터 페이로드를 작은 TCP 헤더로 감싸며, TCP 스택이 이미 데이터 손상을 검출하므로 CRC를 제거합니다.",
        learnMoreLabel: "Modbus 기초 — RTU와 TCP 프레이밍 비교",
    },
    "tables-independent-addressing": {
        prompt: "Input register 0과 holding register 0은 같은 저장 위치이며 서로 다른 두 기능 코드로 접근할 뿐입니다.",
        explain: "네 데이터 테이블은 서로 독립적으로 주소가 지정됩니다. Input 테이블의 register 0과 holding 테이블의 register 0은 <em>서로 다른 저장 위치</em>입니다. 주소만으로는 어느 테이블인지 알 수 없으며, 작업 대상 테이블을 지정하는 기능 코드가 둘을 구분합니다.",
        learnMoreLabel: "Modbus 기초 — 네 데이터 테이블",
    },
    "read-only-16bit-table": {
        prompt: "컨트롤러에서 쓸 수 없는 측정값인 VFD 속도 <em>피드백</em>을 읽어야 합니다. 이 값은 어느 Modbus 테이블에 있을 가능성이 가장 높습니까?",
        explain: "속도 피드백은 클라이언트가 읽기만 하는 16비트 측정값이므로 input register(FC04)에 해당합니다. 반면 속도 <em>명령</em>은 클라이언트가 쓰는 설정값이므로 holding register에 있습니다(읽기 FC03, 쓰기 FC06/FC16). Coil과 discrete input은 1비트 테이블입니다.",
        learnMoreLabel: "Modbus 기초 — 네 데이터 테이블",
        choices: {
            "a": "Holding register(16비트, 읽기/쓰기)",
            "b": "Input register(16비트, 읽기 전용)",
            "c": "Coil(1비트, 읽기/쓰기)",
            "d": "Discrete input(1비트, 읽기 전용)",
        },
    },
    "holding-register-fc-pair": {
        prompt: "BMS 통합에서 holding register의 설정값을 읽고 쓰는 데 가장 많이 사용하는 기능 코드 조합은 무엇입니까?",
        explain: "FC03은 holding register를 읽고 FC16은 여러 holding register를 씁니다(FC06은 하나만 씁니다). FC04는 읽기 전용 센서 값인 <em>input</em> register를 읽습니다. 비트 테이블용 코드(FC01/FC02/FC05/FC15)는 coil과 discrete input에 사용하며, BMS보다 구형 산업 장비에서 더 자주 접합니다.",
        learnMoreLabel: "Modbus 기초 — 기능 코드",
        choices: {
            "a": "읽기 FC03, 쓰기 FC16",
            "b": "읽기 FC04, 쓰기 FC06",
            "c": "읽기 FC02, 쓰기 FC05",
            "d": "읽기 FC01, 쓰기 FC15",
        },
    },
    "max-registers-per-read": {
        prompt: "Modbus 프로토콜에서 한 번의 레지스터 읽기로 요청할 수 있는 레지스터의 최대 개수는 몇 개입니까? (프로토콜 상한이며 개별 디바이스는 더 낮은 한도를 둘 수 있습니다.)",
        explain: "프로토콜은 요청 한 번당 레지스터 읽기를 125개, coil 읽기를 2000개로 제한합니다. 대부분의 디바이스는 문서에 더 엄격한 한도를 명시하므로, ‘모든 항목을 한 번에’ 읽는 폴링은 프로토콜 상한 이내이더라도 실제 디바이스 한도를 조용히 초과할 수 있습니다.",
        learnMoreLabel: "Modbus 기초 — 기능 코드",
    },
    "exception-high-bit-marker": {
        prompt: "FC03 읽기를 전송했는데 서버 응답의 기능 코드 바이트가 <code>0x83</code>으로 돌아왔으며 정상적인 <code>0x03</code>이 아닙니다. 무엇을 의미합니까?",
        explain: "high bit가 설정된 echo는 모든 예외 응답에 공통된 표시입니다. <code>FC 0x03 | 0x80 = 0x83</code>은 ‘요청이 실패했으므로 이유는 다음 바이트를 확인하십시오’라는 뜻입니다. 기능 코드가 그대로 echo되고 high bit가 <em>설정되지 않은</em> 경우는 정상 응답이며, 이후 바이트에는 요청한 데이터가 들어 있습니다.",
        learnMoreLabel: "Modbus 기초 — 예외 응답",
        choices: {
            "a": "정상 응답입니다. <code>0x83</code>은 FC03의 일반 응답 코드입니다.",
            "b": "요청이 실패했습니다. FC의 high bit를 설정해 echo했으므로 다음 바이트가 예외 코드입니다.",
            "c": "디바이스의 통신 속도가 잘못되었습니다.",
            "d": "읽기는 성공했지만 반환된 레지스터가 0개입니다.",
        },
    },
    "exception-decode-wire": {
        prompt: "디바이스 #1을 폴링했더니 주소 바이트 다음에 아래 데이터가 돌아왔습니다. 해석하면 어떤 일이 발생했습니까?",
        explain: "응답 FC 바이트 <code>0x83</code>은 <code>0x03 | 0x80</code>이므로 예외 응답이며, 그 다음 바이트(<code>0x02</code>)가 예외 <em>코드</em>인 Illegal Data Address입니다. 기능 코드는 이해했지만 요청 주소가 디바이스의 문서화된 맵에 없습니다. 가장 흔한 원인은 5자리 주소의 off-by-one입니다. 예를 들어 맵의 끝을 넘어선 레지스터 <code>0x31</code> = 49를 요청한 경우입니다. <code>0x83</code>은 예외 표시이지 원인이 아니며, 원인은 항상 그 다음 바이트입니다.",
        snippet: "<pre class=\"quiz-snippet\">요청:  01 03 00 31 00 01 ...\n응답:  01 83 02 ...</pre>",
        learnMoreLabel: "Modbus 기초 — 예외 응답",
        choices: {
            "a": "레지스터 하나의 데이터를 담은 정상 FC03 응답입니다.",
            "b": "FC03이 예외 <code>0x02</code>(Illegal Data Address)로 실패했습니다. 해당 레지스터가 디바이스 맵에 없습니다.",
            "c": "FC03이 예외 <code>0x83</code>(server failure)으로 실패했습니다.",
            "d": "디바이스가 0x02 = 레지스터 두 개, 값 0x83을 반환했습니다.",
        },
    },
    "illegal-data-value-0x03": {
        prompt: "레지스터에 <code>150</code>을 썼습니다. 매뉴얼은 이 레지스터를 <em>0–100 % 설정값</em>으로 명시하며, 디바이스가 예외 <code>0x03</code>(Illegal Data Value)을 반환했습니다. 무엇을 의미합니까?",
        explain: "<code>0x03</code> Illegal Data Value은 주소는 유효하지만 값이 유효하지 않다는 뜻입니다. 0–100 % 레지스터에 150을 쓰는 것이 대표적인 예입니다. 반면 <code>0x02</code>(Illegal Data Address)는 잘못된 <em>주소</em>, <code>0x01</code>(Illegal Function)은 지원하지 않는 기능 코드를 뜻합니다. Input register 테이블에만 있는 레지스터를 FC03으로 요청할 때 Illegal Function이 발생하는 경우가 많습니다.",
        learnMoreLabel: "Modbus 기초 — 예외 응답",
        choices: {
            "a": "이 디바이스에는 해당 레지스터 주소가 없습니다.",
            "b": "해당 기능 코드를 지원하지 않습니다.",
            "c": "주소는 올바르지만 쓰려는 값이 허용 범위를 벗어났습니다.",
            "d": "디바이스가 오프라인입니다.",
        },
    },
};
