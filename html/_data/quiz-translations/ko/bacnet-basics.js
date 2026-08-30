"use strict";

module.exports = {
    "self-describing": {
        prompt: "BACnet Analog Input 객체는 자체 <code>Object_Name</code>, <code>Units</code>, <code>Present_Value</code>를 포함하므로, 클라이언트는 별도의 제조사 문서 없이도 포인트가 무엇이며 어떤 의미인지 읽을 수 있습니다.",
        explain: "자기 기술성은 BACnet을 규정하는 핵심 개념입니다. 각 객체는 이름, 단위, 설명, 현재값, 한계값처럼 이름과 자료형이 정해진 속성을 노출합니다. 따라서 클라이언트는 처음 접하는 건물에서도 컨트롤러를 조회해 실제로 사용할 수 있는 포인트 목록을 구성할 수 있습니다. 이는 비트의 의미를 제조사 매뉴얼만 알려 주는 <a href=\"/education/modbus-basics.html\">Modbus</a>와 반대되는 방식입니다.",
        learnMoreLabel: "BACnet 기초 — BACnet인 것과 아닌 것",
    },
    "device-instance-unique": {
        prompt: "전체 BACnet 인터네트워크에서 전역적으로 고유해야 하는 식별자는 무엇입니까?",
        explain: "디바이스 인스턴스 번호(0~4,194,302)는 전체 네트워크에서 컨트롤러를 고유하게 식별합니다. 반면 <em>객체</em> 인스턴스 번호는 <em>해당 디바이스 안에서만</em> 고유하면 되므로 모든 컨트롤러에 <code>AI:1</code>이 존재할 수 있습니다. 두 디바이스가 모두 <code>device:1001</code>을 사용하면 발견하기 까다로운 전형적인 통합 장애가 발생합니다.",
        learnMoreLabel: "BACnet 기초 — 디바이스, 객체, 속성",
        choices: {
            "a": "디바이스 인스턴스 번호(예: <code>device:1001</code>)",
            "b": "각 객체의 인스턴스 번호",
            "c": "객체 이름 문자열",
            "d": "COV_Increment",
        },
    },
    "multistate-family": {
        prompt: "온도조절기가 AUTO / HEAT / COOL / OFF 상태를 갖는 모드 포인트를 노출합니다. 어떤 BACnet 객체 계열이 적합합니까?",
        explain: "이름이 지정된 상태가 세 개 이상이면 Multi-state를 사용합니다. 상태 이름은 객체의 <code>State_Text</code> 속성에 저장되며 1부터 시작하는 정수로 지정합니다(1 = AUTO, 2 = HEAT, …). Binary 객체는 정확히 두 상태(ACTIVE / INACTIVE)를 보유하고, Analog 객체는 32비트 부동소수점 값을 보유합니다.",
        learnMoreLabel: "BACnet 기초 — 객체 계열",
        choices: {
            "a": "Binary(BI / BO / BV)",
            "b": "Analog(AI / AO / AV)",
            "c": "Multi-state(MSI / MSO / MSV)",
            "d": "Schedule",
        },
    },
    "av-software-setpoint": {
        prompt: "재실 냉방 설정값이 컨트롤러 프로그램 안에만 존재하며, 연결된 센서도 없고 구동하는 출력 단자도 없습니다. 이 값을 네트워크에 노출할 때 사용해야 하는 객체 유형은 무엇입니까?",
        explain: "각 계열의 <em>Value</em> 객체인 AV, BV, MSV는 소프트웨어 전용 포인트입니다. 다른 계열 구성원과 같은 종류의 속성을 갖지만 연결된 하드웨어 단자는 없습니다. 설정값은 대표적인 AV 용도입니다. 프로그램 안에만 존재하며 클라이언트가 읽고 쓸 수 있는 32비트 부동소수점 값입니다. AO는 그럴듯하지만 잘못된 답입니다. AO는 컨트롤러가 그 값으로 <em>물리 출력을 구동한다</em>는 뜻이므로, 설정값을 AO로 노출하면 포인트의 성격을 잘못 나타내고 통합 담당자가 존재하지 않는 단자를 찾게 됩니다. I/O와 Value의 구분을 이해하는 것은 포인트 목록을 올바르게 읽는 데 필수적입니다.",
        learnMoreLabel: "BACnet 기초 — 객체 계열",
        choices: {
            "a": "Analog Input(AI)",
            "b": "Analog Output(AO)",
            "c": "Analog Value(AV)",
            "d": "Multi-state Value(MSV)",
        },
    },
    "read-many-service": {
        prompt: "하나의 그래픽 화면에 필요한 여러 객체의 속성 30개를 컨트롤러에서 폴링하려고 합니다. 한 번의 요청으로 처리하는 서비스는 무엇입니까?",
        explain: "<code>ReadPropertyMultiple</code>과 쓰기 작업에 대응하는 <code>WritePropertyMultiple</code>은 한 번의 요청으로 여러 속성을 가져옵니다. 속성이 하나이든 30개이든 네트워크 오버헤드는 같습니다. 실제 그래픽 폴링은 개별 <code>ReadProperty</code> 호출을 수없이 보내는 대신 RPM을 사용합니다. 속성을 하나씩 읽는 통합이 필요 이상으로 네트워크에 큰 부하를 주는 이유입니다.",
        learnMoreLabel: "BACnet 기초 — 현장에서 접하는 서비스",
        choices: {
            "a": "<code>ReadProperty</code>를 30번 개별 호출",
            "b": "<code>ReadPropertyMultiple</code>",
            "c": "<code>SubscribeCOV</code>",
            "d": "<code>Who-Is</code>",
        },
    },
    "cov-push": {
        prompt: "<code>SubscribeCOV</code>를 사용하면 값이 <code>COV_Increment</code>보다 크게 변할 때마다 디바이스가 클라이언트에 알릴 수 있으므로, 폴링 대신 푸시 방식으로 동작합니다.",
        explain: "Change-of-Value는 폴링 모델을 뒤집습니다. 클라이언트가 한 번 구독하면 디바이스는 값이 유의미한 만큼 변할 때마다 알림을 전송합니다. Modbus에서는 클라이언트가 변화를 포착할 만큼 빠르게 폴링해야 하지만, BACnet에서는 디바이스가 변화를 알릴 수 있습니다. 구독에는 유효기간이 있으므로 클라이언트는 만료되기 전에 다시 구독합니다.",
        learnMoreLabel: "BACnet 기초 — 현장에서 접하는 서비스",
    },
    "whois-outside-range": {
        prompt: "단일 IP 서브넷에서 디스커버리 스캔을 수행했는데 디바이스 하나가 누락되었습니다. <code>device:2050</code>인 옥상형 공조기는 직접 <code>ReadProperty</code>를 보내면 정상 응답하지만 검색 결과에는 나타나지 않습니다. 무슨 일이 발생한 것입니까?",
        explain: "<code>Who-Is</code>는 범위 없이 전송해 모든 디바이스에 응답을 요청할 수도 있고, 디바이스 인스턴스의 하한과 상한을 지정해 전송할 수도 있습니다. 디바이스는 자신의 인스턴스가 그 범위 안에 있을 때만 응답합니다. 이 스캔은 1000~1999를 요청했으므로 <code>device:2050</code>은 설계대로 응답하지 않았습니다. 오프라인이거나 차단되었거나 고장 난 것이 아닙니다. <em>같은</em> 서브넷에서는 디바이스를 의심하기 전에 스캔 범위를 확인합니다. (서브넷이 다를 때 디스커버리에서 누락되는 현상은 실제로 브로드캐스트 문제이며, 이는 <a href=\"/education/bacnet-networking.html\">BACnet 네트워킹</a>에서 다룹니다.) 응답 확인이 유실되었다는 추측도 맞지 않습니다. Who-Is와 I-Am은 모두 unconfirmed 서비스이므로 확인 응답 자체가 필요하지 않습니다.",
        snippet: "<pre class=\"quiz-snippet\">디스커버리 스캔:  Who-Is 1000..1999   (세 디바이스 모두 같은 서브넷)\n네트워크 구성:     device:1001   device:1002   device:2050\n스캔 결과:         device:1001   device:1002</pre>",
        learnMoreLabel: "BACnet 기초 — 현장에서 접하는 서비스",
        choices: {
            "a": "RTU가 네트워크에서 이탈했습니다.",
            "b": "스캔 도구와 RTU 사이의 라우터가 브로드캐스트를 차단하고 있습니다.",
            "c": "<code>I-Am</code>은 confirmed 서비스이며 RTU의 확인 응답이 유실되었습니다.",
            "d": "<code>Who-Is</code>에 디바이스 인스턴스 범위가 지정되었고 2050은 그 범위 밖에 있습니다.",
        },
    },
    "cov-subscription-stale": {
        prompt: "그래픽 화면의 급기 온도가 <code>SubscribeCOV</code> 구독으로 갱신됩니다. 몇 시간째 값이 변하지 않았지만 같은 포인트를 수동으로 <code>ReadProperty</code>하면 <code>COV_Increment</code>를 훨씬 넘겨 변한 최신 값이 반환됩니다. 가장 가능성 높은 원인은 무엇입니까?",
        explain: "COV 구독에는 유효기간이 있으며, 만료되면 디바이스는 별도의 오류 없이 전송을 중단합니다. 그래픽 화면에는 마지막으로 푸시된 값만 남습니다. 수동 읽기에서 최신 값이 반환되는 것이 핵심 단서입니다. 포인트는 네트워크에서 정상이며 구독 경로에서만 멈춘 상태입니다. 정상적인 클라이언트는 유효기간이 끝나기 전에 다시 구독합니다. <code>COV_Increment</code>가 너무 크면 알림이 발생하지 않을 수 있지만, 이 문제에서는 값이 이미 증분값을 크게 넘어 변했는데도 알림이 없었으므로 해당하지 않습니다. 센서가 고장 났다면 변화하는 최신 값을 읽을 수 없고, 우선순위 8의 오버라이드가 원인이라면 읽은 값도 고정되어야 합니다. 최신 <code>ReadProperty</code> 값이 두 가능성을 모두 배제합니다.",
        learnMoreLabel: "BACnet 기초 — 현장에서 접하는 서비스",
        choices: {
            "a": "구독 유효기간이 만료되었지만 클라이언트가 다시 구독하지 않았습니다.",
            "b": "센서가 고장 났습니다.",
            "c": "<code>COV_Increment</code>가 너무 커서 값 변화가 알림을 발생시키지 못했습니다.",
            "d": "누군가 우선순위 8에서 포인트를 오버라이드했습니다.",
        },
    },
    "priority-lowest-non-null": {
        prompt: "명령 가능한 AO에서 슬롯 8(수동 오버라이드)은 <code>0 %</code>, 슬롯 16(BMS 시퀀스)은 <code>65 %</code>를 보유하고 나머지 슬롯은 모두 null입니다. 이 객체의 <code>Present_Value</code>는 얼마입니까?",
        explain: "<code>Present_Value</code>는 <em>번호가 가장 작은 non-null 슬롯</em>의 값으로 결정됩니다. 슬롯 8은 슬롯 16보다 우선하므로 수동 오버라이드가 승리하고 출력은 0 %가 됩니다. 슬롯 1의 우선순위가 가장 높고 슬롯 16이 가장 낮습니다. 모든 슬롯이 null이면 객체는 <code>Relinquish_Default</code>로 폴백합니다.",
        learnMoreLabel: "BACnet 기초 — 우선순위 배열",
        choices: {
            "a": "65 % — 슬롯 16의 시퀀스가 승리합니다.",
            "b": "0 % — 번호가 가장 작은 non-null 슬롯이 승리합니다.",
            "c": "두 값의 평균인 32.5 %입니다.",
            "d": "가장 최근에 기록된 값입니다.",
        },
    },
    "release-with-null": {
        prompt: "댐퍼가 몇 달 전에 설정된 슬롯 8의 수동 오버라이드에 고정되어 있고, 시퀀스는 계속 슬롯 16에 값을 쓰고 있습니다. 제어권을 시퀀스에 돌려주려면 어떻게 해야 합니까?",
        explain: "슬롯 8에 null을 쓰면 해당 슬롯이 <em>해제</em>되어 비워집니다. 번호가 가장 작은 non-null 슬롯은 슬롯 16이 되고 다른 변경 없이 시퀀스가 제어권을 가져갑니다. 슬롯 8에 값이 올바르더라도 어떤 값을 쓰면 숫자만 달라진 채 오버라이드는 그대로 유지됩니다. 오버라이드를 해제하지 않는 것은 우선순위 배열 로직이 고장 난 것처럼 보이는 가장 흔한 원인입니다. 그래픽 화면은 시퀀스가 쓰는 값이 아니라 최종 결정된 값을 표시합니다.",
        learnMoreLabel: "BACnet 기초 — 우선순위 배열",
        choices: {
            "a": "시퀀스의 값도 슬롯 8에 씁니다.",
            "b": "슬롯 8에 <em>null</em>을 씁니다.",
            "c": "새 값을 슬롯 1에 씁니다.",
            "d": "컨트롤러의 전원을 껐다가 다시 켭니다.",
        },
    },
    "relinquish-default-fallback": {
        prompt: "명령 가능한 객체의 <code>Priority_Array</code> 슬롯 16개를 모두 null로 해제하면 <code>Present_Value</code>는 마지막으로 명령받은 값을 그대로 유지합니다.",
        explain: "배열 전체가 비면 객체는 <code>Relinquish_Default</code> 속성으로 폴백합니다. 이는 마지막 명령을 기억한 값이 아니라 구성된 기본값입니다. 시운전 시 특히 중요합니다. 포인트를 붙잡고 있던 유일한 오버라이드를 해제했을 때 다른 쓰기 명령이 없다면 그 위치를 유지하지 않고 <code>Relinquish_Default</code>가 지정하는 값으로 이동합니다. 이는 ‘아무도 명령하지 않았는데 밸브가 밤새 왜 움직였습니까?’라는 질문의 전형적인 답입니다. 슬롯별 폴백 동작을 확인하려면 <a href=\"/tools/bacnet-priority.html\">BACnet 우선순위 배열 도구</a>에서 배열을 비우고 어떤 값이 적용되는지 확인할 수 있습니다.",
        learnMoreLabel: "BACnet 기초 — 우선순위 배열",
    },
    "multistate-mapped-as-binary": {
        prompt: "통합 과정에서 3상태 팬 명령을 아래와 같이 BMS에 매핑했습니다. 무엇이 잘못됩니까?",
        explain: "Binary 객체는 엄격하게 두 상태(ACTIVE / INACTIVE)만 가집니다. 3상태 Multi-state 명령은 Binary 객체를 통해 온전히 왕복할 수 없습니다. LOW와 HIGH의 구분이 하나로 합쳐지고 BMS에서는 세 번째 상태에 명령할 수 없게 됩니다. 해결하려면 Multi-state Value로 매핑하면서 <code>State_Text</code>를 함께 전달하거나, 상태를 손실 없이 표현하는 다른 방식을 사용해야 합니다. 데이터에 맞는 객체 <em>계열</em>을 선택하는 것은 포인트 목록을 올바르게 읽는 과정의 일부입니다.",
        snippet: "<pre class=\"quiz-snippet\">원본 객체:  MSV:4  Fan_Mode  (1=OFF, 2=LOW, 3=HIGH)\n매핑 결과:  BV:21  Fan_Cmd   (INACTIVE / ACTIVE)</pre>",
        learnMoreLabel: "BACnet 기초 — 객체 계열",
        choices: {
            "a": "문제가 없습니다. Binary Value는 상태를 몇 개든 보유할 수 있습니다.",
            "b": "Binary Value는 두 상태만 보유하므로 LOW와 HIGH가 하나로 합쳐지고 세 번째 상태에는 도달할 수 없습니다.",
            "c": "Multi-state 객체는 디바이스 간에 매핑할 수 없습니다.",
            "d": "매핑이 동작하려면 인스턴스 번호가 서로 같아야 합니다.",
        },
    },
    "multistate-one-based": {
        prompt: "프런트엔드가 아래 매핑을 통해 존의 재실 모드에 명령합니다. 무엇이 잘못됩니까?",
        explain: "Multi-state <code>Present_Value</code>는 1부터 시작하는 열거형입니다. 3상태 객체는 상태 1, 2, 3 중 하나를 가지며 <em>상태 0은 존재하지 않습니다</em>. <code>State_Text</code>의 항목 1은 상태 1의 이름입니다. 이름은 레이블이고 실제로 쓰는 값은 정수입니다. 0부터 시작하는 습관으로 만든 매핑은 두 가지 문제를 일으킵니다. 0 쓰기는 범위를 벗어나 거부되고, 나머지 명령은 모두 한 단계 낮은 상태에 적용됩니다. UNOCCUPIED에 1을 쓰면 실제로 OCCUPIED가 선택되고, STANDBY에 2를 쓰면 UNOCCUPIED가 선택되어 STANDBY에는 도달할 수 없습니다. 대부분의 쓰기 자체는 성공하지만 존이 잘못 동작하므로, 한 칸씩 어긋난 열거형 매핑은 전형적인 통합 버그입니다.",
        snippet: "<pre class=\"quiz-snippet\">대상 객체:      MSV:7  Occ_Mode   State_Text: [\"OCCUPIED\", \"UNOCCUPIED\", \"STANDBY\"]\n프런트엔드 매핑:  OCCUPIED=0   UNOCCUPIED=1   STANDBY=2      ← 쓰는 값</pre>",
        learnMoreLabel: "BACnet 기초 — 객체 계열",
        choices: {
            "a": "문제가 없습니다. 0, 1, 2는 3상태 객체에 모두 유효한 상태입니다.",
            "b": "프런트엔드는 상태 <em>이름</em>(\"OCCUPIED\", \"UNOCCUPIED\", \"STANDBY\")을 써야 하며 숫자는 사용할 수 없습니다.",
            "c": "MSV 객체에는 명령할 수 없으므로 어떤 쓰기도 적용되지 않습니다.",
            "d": "Multi-state 상태 번호는 1부터 N까지이므로 상태 0이 없습니다. OCCUPIED 쓰기는 실패하고 나머지 두 명령은 한 단계 낮은 상태에 적용됩니다.",
        },
    },
    "bacnet-ip-port": {
        prompt: "BACnet/IP가 기본으로 사용하는 UDP 포트는 무엇입니까? (16진수로 <code>0xBAC0</code>이며, ‘BACnet’ 포트라는 연상법의 근거입니다.)",
        explain: "IANA에 등록된 BACnet/IP 포트는 UDP <strong>47808</strong>이며, 16진수로 <code>0xBAC0</code>입니다. 16진수 표현을 알면 <code>BAC0</code>으로 끝나는 디바이스 주소를 알아볼 수 있고, <code>BAC1</code>(47809)로 끝나는 주소는 기본값이 아닌 두 번째 BACnet/IP 네트워크의 디바이스임을 식별할 수 있습니다.",
        learnMoreLabel: "BACnet 기초 — MS/TP와 BACnet/IP 비교",
    },
    "mstp-ip-same-object-model": {
        prompt: "컨트롤러를 MS/TP 버스에서 BACnet/IP로 옮겨도 객체 모델, 속성 이름, 서비스, 우선순위 배열은 모두 동일하게 유지되며 각 메시지를 감싸는 프레이밍만 달라집니다.",
        explain: "MS/TP와 BACnet/IP는 동일한 프로토콜 로직을 위한 두 가지 데이터 링크 선택지입니다. 객체, 속성, 서비스, 우선순위 배열은 ASHRAE 135에서 한 번 정의되며 하부 매체와 무관합니다. 달라지는 것은 RS-485 토큰 패싱 프레임과 UDP 포트 47808의 데이터그램이라는 래퍼뿐입니다. 경계를 넘을 때 달라지는 부분은 <em>브로드캐스트</em>이며, 이는 BACnet 네트워킹에서 다룹니다.",
        learnMoreLabel: "BACnet 기초 — MS/TP와 BACnet/IP 비교",
    },
};
