"use strict";

module.exports = {
    "five-digit-wire-address": {
        prompt: "제조사의 Modbus 테이블에 급기 온도가 <code>40123</code>으로 표시되어 있습니다. 선로에 전송할 주소는 무엇입니까?",
        explain: "맨 앞의 <code>4</code>는 holding register 테이블을 나타내며 선로 주소의 일부가 아닙니다. 나머지 네 자리는 1부터 시작하므로 <code>40123</code>은 ‘123번째 holding register’를 뜻합니다. 선로 주소는 0부터 시작하므로 실제 주소는 <code>123 − 1 = 122</code>입니다. <code>40123</code>을 그대로 읽으면 예외가 발생하고, <code>123</code>을 읽는 것이 전형적인 off-by-one 오류입니다.",
        learnMoreLabel: "Modbus 디코딩 — 5자리 번호 표기의 함정",
        choices: {
            "a": "<code>40123</code>",
            "b": "<code>123</code>",
            "c": "<code>122</code>",
            "d": "<code>124</code>",
        },
    },
    "five-digit-table-prefix": {
        prompt: "제조사 매뉴얼에서 <code>30005</code>를 확인했습니다. 어떤 기능 코드로 읽어야 하며 선로 주소는 무엇입니까?",
        explain: "맨 앞의 <code>3</code>은 input register 테이블, 즉 FC 04를 뜻합니다. 나머지 <code>0005</code>는 1부터 시작하므로 선로 주소는 <code>4</code>입니다. FC 03은 맨 앞이 <code>4</code>인 holding register를 읽습니다. 맨 앞이 <code>3</code>인 주소에 FC 03을 사용해 예외가 발생하는 것이 흔한 혼동입니다.",
        learnMoreLabel: "Modbus 기초 — 기능 코드",
        choices: {
            "a": "FC 03, 선로 주소 <code>5</code>",
            "b": "FC 04, 선로 주소 <code>4</code>",
            "c": "FC 03, 선로 주소 <code>4</code>",
            "d": "FC 04, 선로 주소 <code>5</code>",
        },
    },
    "signed-high-bit": {
        prompt: "16비트 레지스터가 <code>0xFFF3</code>을 반환했습니다. 문서에서 자료형을 <code>INT16</code>으로 지정했다면 high bit가 1이라는 것은 디코딩된 값이 음수임을 의미합니다.",
        explain: "2의 보수에서는 부호 있는 자료형의 high bit가 설정되면 음수입니다. <code>0xFFF3</code>을 INT16으로 해석하면 <code>−13</code>, UINT16으로 해석하면 <code>65523</code>입니다. 비트 패턴은 동일하며 어떤 방식으로 해석할지는 통합 설정이 결정하고, 올바른 방식은 문서에서 확인합니다.",
        learnMoreLabel: "Modbus 디코딩 — Signed와 unsigned",
    },
    "signed-misread-signature": {
        prompt: "외기 온도 센서가 추운 날씨에 가끔 약 <code>65521</code>을 표시합니다. 가장 가능성 높은 원인은 무엇입니까?",
        explain: "물리적으로 그렇게 큰 값에 도달할 수 없는 센서가 <code>65535</code> 부근에 고정되는 것은 부호 있는 값을 unsigned로 읽고 있다는 명확한 신호입니다. UINT16의 <code>65521</code>은 INT16으로 <code>−15</code>이며, 추운 외기 온도로 충분히 타당합니다. 센서가 아니라 통합 설정의 자료형 태그를 수정해야 합니다.",
        learnMoreLabel: "Modbus 디코딩 — Signed와 unsigned",
        choices: {
            "a": "센서가 불안정하므로 프로브를 교체해야 합니다.",
            "b": "BMS에 wrap-around 버그가 있습니다.",
            "c": "부호 있는 레지스터(INT16)를 unsigned로 읽고 있습니다.",
            "d": "통합 테이블의 스케일 계수가 잘못되었습니다.",
        },
    },
    "byte-order-identify": {
        prompt: "제조사 문서에 따르면 레지스터 <code>40101</code>의 32비트 부동소수점 값은 <code>50.24 °F</code>입니다. 레지스터 두 개를 읽었더니 선로에서 아래와 같이 확인되었습니다. 이 디바이스는 어떤 바이트 순서를 사용합니까?",
        explain: "선로에서 읽은 순서대로 다시 조합하면 <code>F5 C3 42 48</code>입니다. <code>0x4248F5C3</code>을 IEEE-754 big-endian 부동소수점으로 해석하면 약 50.24이므로, 네트워크 순서에서 바이트는 <em>원래</em> <code>42 48 F5 C3</code>이어야 하지만 실제 순서는 다릅니다. 두 레지스터의 순서를 바꾸면 <code>4248 F5C3</code>이 되어 올바르게 디코딩되므로 CDAB입니다. (구형 Modicon PLC는 내부 little-endian 워드 배열을 이 방식으로 선로에 전달했습니다.)",
        snippet: "<pre class=\"quiz-snippet\">register 40101 (N+0):  0xF5C3\nregister 40102 (N+1):  0x4248</pre>",
        learnMoreLabel: "Modbus 디코딩 — 네 가지 바이트 순서",
        choices: {
            "a": "ABCD(strict-Modbus)",
            "b": "CDAB(Modicon word-swap)",
            "c": "BADC(byte-in-word)",
            "d": "DCBA(full reverse)",
        },
    },
    "byte-order-consistency": {
        prompt: "디바이스의 32비트 바이트 순서를 한 번 확인하면 해당 디바이스의 모든 32비트 값에서 같은 순서를 사용한다고 볼 수 있습니다.",
        explain: "제조사는 한 제품 안에서 바이트 순서를 섞어 사용하지 않습니다. 시운전 시 한 번 확인하고(<a href=\"/tools/modbus-register-viewer.html\">Modbus 레지스터 뷰어</a>의 32비트 쌍 탭이 이 작업을 위해 만들어졌습니다), 현장 문서에 기록한 뒤 다음 작업으로 넘어갑니다. 모든 레지스터를 다시 시험할 필요는 없습니다.",
        learnMoreLabel: "Modbus 디코딩 — 네 가지 바이트 순서",
    },
    "scaling-tenths": {
        prompt: "Holding register가 <code>523</code>을 반환했습니다. 제조사 문서에는 <em>scale 0.1, units °F</em>라고 되어 있습니다. °F 단위의 엔지니어링 값은 얼마입니까?",
        explain: "정수에 소수점 한 자리를 보존하기 위해 레지스터가 실제 값 × 10을 저장하는 암시적 소수점 방식입니다. <code>523 × 0.1 = 52.3 °F</code>이며, 가장 흔한 Modbus 스케일링 패턴입니다.",
        learnMoreLabel: "Modbus 디코딩 — 스케일링",
    },
    "scaling-offset": {
        prompt: "레지스터가 <code>1024</code>를 반환했습니다. 문서에 인코딩 방식이 <em>(actual − 100) × 10</em>이라고 되어 있습니다. 실제 엔지니어링 값은 얼마입니까?",
        explain: "인코딩을 역산하면 <code>actual = (raw / 10) + 100 = (1024 / 10) + 100 = 102.4 + 100 = 202.4</code>입니다. Offset-and-scale 패턴에서는 문서에 두 수가 모두 명시되며 두 수를 모두 적용해야 합니다. 보정값을 직접 노출하던 구형 장비에서 이 형태를 자주 사용합니다.",
        learnMoreLabel: "Modbus 디코딩 — 스케일링",
    },
    "exception-illegal-address": {
        prompt: "디바이스에서 레지스터 <code>40050</code>을 읽었더니 예외 코드 <code>0x02</code>(Illegal Data Address)가 반환되었습니다. 디바이스가 응답했다면 가장 가능성 높은 상황은 무엇입니까?",
        explain: "<code>0x02</code>는 디바이스가 기능 코드를 이해하고 응답했지만 요청한 주소 또는 주소 범위가 해당 디바이스에 없다는 뜻입니다. 새로 통합한 디바이스에서 가장 흔한 원인은 <code>40050</code>을 선로 주소 <code>50</code>으로 읽는 것입니다. 올바른 주소는 <code>49</code>이며, 이는 5자리 번호 표기의 off-by-one입니다. 지원하지 않는 기능 코드는 <code>0x01</code>(Illegal Function)이며 <code>0x02</code>가 아닙니다.",
        learnMoreLabel: "Modbus 기초 — 예외 응답",
        choices: {
            "a": "디바이스가 오프라인입니다. <code>0x02</code>는 연결 계층 오류입니다.",
            "b": "레지스터는 존재하지만 현재 값을 읽을 수 없습니다.",
            "c": "선로 주소가 디바이스에 구현된 맵 범위를 벗어났습니다. 흔히 5자리 번호 표기의 off-by-one입니다.",
            "d": "디바이스가 기능 코드 <code>0x03</code>을 지원하지 않습니다.",
        },
    },
    "fc03-vs-fc04-poll": {
        prompt: "Niagara 통합의 폴링 정의가 아래와 같습니다. 무엇이 잘못되었습니까?",
        explain: "포인트 이름의 맨 앞 <code>4</code>는 holding register, 즉 FC 03을 뜻하고, 맨 앞 <code>3</code>은 input register, 즉 FC 04를 뜻합니다. 이 폴링은 input register를 요청하면서 holding register로 명시된 주소에 매핑하고 있습니다. 기능을 <code>ReadHoldingRegisters (FC 03)</code>으로 변경하거나 포인트 맵을 <code>30001..30010</code>으로 변경해야 합니다. 잘못된 테이블을 읽는 것은 ‘읽기는 성공하지만 값이 잘못됨’의 #2 원인이며, #1은 앞에서 설명한 5자리 주소 off-by-one입니다.",
        snippet: "<pre class=\"quiz-snippet\">Device:        AHU-1\nFunction:      ReadInputRegisters (FC 04)\nStart address: 0\nQuantity:      10\nPoint maps:    40001..40010 → AI_01..AI_10</pre>",
        learnMoreLabel: "Modbus 기초 — 기능 코드",
        choices: {
            "a": "FC 04에서 시작 주소 <code>0</code>은 포인트 데이터가 아니라 디바이스 펌웨어 데이터를 읽습니다.",
            "b": "포인트 맵은 5자리 holding 주소(<code>4xxxx</code>)를 사용하지만 기능 코드는 input register를 읽습니다. 기능 코드와 테이블 접두사가 일치해야 합니다.",
            "c": "수량(<code>10</code>)이 FC 04의 프레임당 한도를 초과합니다.",
            "d": "문제가 없습니다. 유효한 Niagara ProxyExt 구성입니다.",
        },
    },
};
