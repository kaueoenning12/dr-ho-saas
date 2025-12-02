export interface Document {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  description: string;
  pdfUrl: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
}

export const mockDocuments: Document[] = [
  {
    id: "1",
    title: "NR-01 - Disposições Gerais e Gerenciamento de Riscos",
    category: "Normas Regulamentadoras",
    keywords: ["nr-01", "gerenciamento", "riscos", "segurança"],
    description: "Estabelece as disposições gerais, o campo de aplicação, os termos e as definições comuns às Normas Regulamentadoras.",
    pdfUrl: "https://www.gov.br/trabalho-e-previdencia/pt-br/composicao/orgaos-especificos/secretaria-de-trabalho/inspecao/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-01.pdf",
    publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 dias atrás
    views: 1234,
    likes: 89,
    comments: 12,
  },
  {
    id: "2",
    title: "NR-06 - Equipamentos de Proteção Individual",
    category: "Normas Regulamentadoras",
    keywords: ["epi", "proteção", "equipamentos", "individual"],
    description: "Estabelece e define os tipos de EPI e as situações em que devem ser utilizados.",
    pdfUrl: "https://www.gov.br/trabalho-e-previdencia/pt-br/composicao/orgaos-especificos/secretaria-de-trabalho/inspecao/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-06.pdf",
    publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 15 dias atrás
    views: 2103,
    likes: 156,
    comments: 23,
  },
  {
    id: "3",
    title: "NR-12 - Segurança no Trabalho em Máquinas e Equipamentos",
    category: "Normas Regulamentadoras",
    keywords: ["máquinas", "equipamentos", "segurança", "proteção"],
    description: "Define referências técnicas, princípios fundamentais e medidas de proteção para garantir a saúde e a integridade física dos trabalhadores.",
    pdfUrl: "https://www.gov.br/trabalho-e-previdencia/pt-br/composicao/orgaos-especificos/secretaria-de-trabalho/inspecao/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-12.pdf",
    publishedAt: "2024-08-01", // Mais antigo
    views: 1876,
    likes: 134,
    comments: 18,
  },
  {
    id: "4",
    title: "NR-17 - Ergonomia",
    category: "Normas Regulamentadoras",
    keywords: ["ergonomia", "postura", "conforto", "trabalho"],
    description: "Estabelece parâmetros que permitam a adaptação das condições de trabalho às características psicofisiológicas dos trabalhadores.",
    pdfUrl: "https://www.gov.br/trabalho-e-previdencia/pt-br/composicao/orgaos-especificos/secretaria-de-trabalho/inspecao/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-17.pdf",
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 dias atrás
    views: 1567,
    likes: 98,
    comments: 15,
  },
  {
    id: "5",
    title: "NR-35 - Trabalho em Altura",
    category: "Normas Regulamentadoras",
    keywords: ["altura", "queda", "proteção", "treinamento"],
    description: "Estabelece requisitos mínimos e medidas de proteção para trabalho em altura.",
    pdfUrl: "https://www.gov.br/trabalho-e-previdencia/pt-br/composicao/orgaos-especificos/secretaria-de-trabalho/inspecao/seguranca-e-saude-no-trabalho/normas-regulamentadoras/nr-35.pdf",
    publishedAt: "2024-07-15", // Mais antigo
    views: 2456,
    likes: 201,
    comments: 31,
  },
];

export const categories = [
  "Todas",
  "Normas Regulamentadoras",
  "Boas Práticas",
  "Manuais Técnicos",
  "Legislação",
];

// Plano Único Doutor HO
export const doutorHOPlan = {
  id: "doutor-ho-anual",
  name: "Doutor HO - Acesso Completo",
  priceYearly: 382.80,
  priceMonthly: 31.90,
  monthlyInstallments: 12,
  billingPeriod: "yearly" as const,
  features: [
    "Acesso ilimitado a todos os relatórios de riscos",
    "Curadoria quinzenal de novos relatórios",
    "Relatórios em português sobre riscos químicos, físicos e biológicos",
    "Campo de comentários para tirar dúvidas",
    "Resposta da equipe em até 1 dia útil",
    "Acesso por qualquer dispositivo (celular, tablet, desktop)",
    "Solicitação de novos processos/temas prioritários",
    "Garantia incondicional de 7 dias",
  ],
};

export const mockDocumentContents: Record<string, string> = {
  "1": `NR-01 - DISPOSIÇÕES GERAIS E GERENCIAMENTO DE RISCOS OCUPACIONAIS

1. OBJETIVO E CAMPO DE APLICAÇÃO

1.1 Esta Norma estabelece as disposições gerais, o campo de aplicação, os termos e as definições comuns às Normas Regulamentadoras - NR relativas à segurança e saúde no trabalho e as diretrizes e os requisitos para o gerenciamento de riscos ocupacionais e as medidas de prevenção em Segurança e Saúde no Trabalho - SST.

1.2 As NR são de observância obrigatória pelas organizações e pelos órgãos públicos da administração direta e indireta, bem como pelos órgãos dos Poderes Legislativo, Judiciário e Ministério Público, que possuam empregados regidos pela Consolidação das Leis do Trabalho - CLT.

1.3 A observância das NR não desobriga as organizações do cumprimento de outras disposições que, com relação à matéria, sejam incluídas em códigos de obras ou regulamentos sanitários dos Estados ou Municípios, bem como daquelas oriundas de convenções e acordos coletivos de trabalho.

2. TERMOS E DEFINIÇÕES

2.1 Para fins de aplicação das NR, considera-se:

a) Trabalhador: pessoa física que exerce atividade de trabalho remunerado, incluindo os trabalhadores avulsos, temporários, autônomos, cooperados e empregados domésticos.

b) Empregador: a empresa individual ou coletiva, que, assumindo os riscos da atividade econômica, admite, assalaria e dirige a prestação pessoal de serviço.

c) Organização: uma empresa, corporação, firma, estabelecimento, instituição, órgão ou entidade, ou uma parte ou combinação desses, pública ou privada, que tem suas próprias funções e administração.

d) Estabelecimento: cada uma das unidades da organização, funcionando em lugares diferentes, tais como: sede, filial, agência, entre outros.

e) Setor de serviço: área, local ou espaço de trabalho onde são executadas atividades com características semelhantes dentro de uma organização.

f) Local de trabalho: qualquer área, interna ou externa, onde são executadas atividades relacionadas ao trabalho sob o controle da organização.

3. GERENCIAMENTO DE RISCOS OCUPACIONAIS

3.1 O empregador deve implementar o Gerenciamento de Riscos Ocupacionais - GRO.

3.2 O GRO deve constituir um Programa de Gerenciamento de Riscos - PGR.

3.3 O PGR deve contemplar ou estar integrado com planos, programas e outros documentos previstos na legislação de segurança e saúde no trabalho.`,
  
  "2": `NR-06 - EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL - EPI

1. DISPOSIÇÕES GERAIS

1.1 Para os fins de aplicação desta Norma Regulamentadora - NR, considera-se Equipamento de Proteção Individual - EPI todo dispositivo ou produto, de uso individual utilizado pelo trabalhador, destinado à proteção de riscos suscetíveis de ameaçar a segurança e a saúde no trabalho.

1.2 Entende-se como Equipamento Conjugado de Proteção Individual todo aquele composto por vários dispositivos que o fabricante tenha associado contra um ou mais riscos que possam ocorrer simultaneamente e que sejam suscetíveis de ameaçar a segurança e a saúde no trabalho.

2. DAS RESPONSABILIDADES

2.1 Cabe ao empregador quanto ao EPI:

a) adquirir o adequado ao risco de cada atividade;
b) exigir seu uso;
c) fornecer ao trabalhador somente o aprovado pelo órgão nacional competente em matéria de segurança e saúde no trabalho;
d) orientar e treinar o trabalhador sobre o uso adequado, guarda e conservação;
e) substituir imediatamente, quando danificado ou extraviado;
f) responsabilizar-se pela higienização e manutenção periódica;
g) comunicar ao MTE qualquer irregularidade observada;
h) registrar o seu fornecimento ao trabalhador, podendo ser adotados livros, fichas ou sistema eletrônico.

2.2 Cabe ao trabalhador quanto ao EPI:

a) usar, utilizando-o apenas para a finalidade a que se destina;
b) responsabilizar-se pela guarda e conservação;
c) comunicar ao empregador qualquer alteração que o torne impróprio para uso;
d) cumprir as determinações do empregador sobre o uso adequado.

3. CERTIFICADO DE APROVAÇÃO - CA

3.1 Todo EPI deve possuir o Certificado de Aprovação - CA, expedido pelo órgão nacional competente em matéria de segurança e saúde no trabalho do Ministério do Trabalho e Emprego.`,

  "3": `NR-12 - SEGURANÇA NO TRABALHO EM MÁQUINAS E EQUIPAMENTOS

1. PRINCÍPIOS GERAIS

1.1 Esta Norma Regulamentadora e seus anexos definem referências técnicas, princípios fundamentais e medidas de proteção para garantir a saúde e a integridade física dos trabalhadores e estabelece requisitos mínimos para a prevenção de acidentes e doenças do trabalho nas fases de projeto e de utilização de máquinas e equipamentos de todos os tipos, e ainda à sua fabricação, importação, comercialização, exposição e cessão a qualquer título, em todas as atividades econômicas, sem prejuízo da observância do disposto nas demais NRs aprovadas pela Portaria MTb n.º 3.214, de 8 de junho de 1978, nas normas técnicas oficiais e, na ausência ou omissão destas, nas normas internacionais aplicáveis.

1.2 Entende-se como fase de utilização o transporte, montagem, instalação, ajuste, operação, limpeza, manutenção, inspeção, desativação e desmonte da máquina ou equipamento.

2. ARRANJO FÍSICO E INSTALAÇÕES

2.1 Nos locais de instalação de máquinas e equipamentos, as áreas de circulação devem ser devidamente demarcadas e em conformidade com as normas técnicas oficiais.

2.2 As vias principais de circulação nos locais de trabalho e as que conduzem às saídas devem ter, no mínimo, 1,20m (um metro e vinte centímetros) de largura.

2.3 As áreas de circulação devem ser mantidas permanentemente desobstruídas.

3. INSTALAÇÕES E DISPOSITIVOS ELÉTRICOS

3.1 As instalações elétricas das máquinas e equipamentos devem ser projetadas e mantidas de modo a prevenir, por meios seguros, os perigos de choque elétrico, incêndio, explosão e outros tipos de acidentes, conforme previsto na NR 10.`,

  "4": `NR-17 - ERGONOMIA

1. OBJETIVO

1.1 Esta Norma Regulamentadora visa estabelecer as diretrizes e os requisitos que permitam a adaptação das condições de trabalho às características psicofisiológicas dos trabalhadores, de modo a proporcionar conforto, segurança, saúde e desempenho eficiente no trabalho.

1.2 As condições de trabalho incluem aspectos relacionados ao levantamento, transporte e descarga de materiais, ao mobiliário dos postos de trabalho, ao trabalho com máquinas, equipamentos e ferramentas manuais, às condições de conforto no ambiente de trabalho e à própria organização do trabalho.

2. LEVANTAMENTO, TRANSPORTE E DESCARGA INDIVIDUAL DE MATERIAIS

2.1 Para efeito desta Norma Regulamentadora:

2.1.1 Transporte manual de cargas designa todo transporte no qual o peso da carga é suportado inteiramente por um só trabalhador, compreendendo o levantamento e a deposição da carga.

2.1.2 Transporte manual regular de cargas designa toda atividade realizada de maneira contínua ou que inclua, mesmo de forma descontínua, o transporte manual de cargas.

2.2 Não deverá ser exigido nem admitido o transporte manual de cargas, por um trabalhador cujo peso seja suscetível de comprometer sua saúde ou sua segurança.

2.3 Todo trabalhador designado para o transporte manual regular de cargas, que não as leves, deve receber treinamento ou instruções satisfatórias quanto aos métodos de trabalho que deverá utilizar, com vistas a salvaguardar sua saúde e prevenir acidentes.

3. MOBILIÁRIO DOS POSTOS DE TRABALHO

3.1 Sempre que o trabalho puder ser executado na posição sentada, o posto de trabalho deve ser planejado ou adaptado para esta posição.

3.2 Para trabalho manual sentado ou que tenha de ser feito em pé, as bancadas, mesas, escrivaninhas e os painéis devem proporcionar ao trabalhador condições de boa postura, visualização e operação e devem atender aos seguintes requisitos mínimos:

a) ter altura e características da superfície de trabalho compatíveis com o tipo de atividade, com a distância requerida dos olhos ao campo de trabalho e com a altura do assento;
b) ter área de trabalho de fácil alcance e visualização pelo trabalhador;
c) ter características dimensionais que possibilitem posicionamento e movimentação adequados dos segmentos corporais.`,

  "5": `NR-35 - TRABALHO EM ALTURA

1. OBJETIVO E CAMPO DE APLICAÇÃO

1.1 Esta Norma estabelece os requisitos mínimos e as medidas de proteção para o trabalho em altura, envolvendo o planejamento, a organização e a execução, de forma a garantir a segurança e a saúde dos trabalhadores envolvidos direta ou indiretamente com esta atividade.

1.2 Considera-se trabalho em altura toda atividade executada acima de 2,00 m (dois metros) do nível inferior, onde haja risco de queda.

1.3 Esta norma se complementa com as normas técnicas oficiais estabelecidas pelos Órgãos competentes e, na ausência ou omissão dessas, com as normas internacionais aplicáveis.

2. RESPONSABILIDADES

2.1 Cabe ao empregador:

a) garantir a implementação das medidas de proteção estabelecidas nesta Norma;
b) assegurar a realização da Análise de Risco - AR e, quando aplicável, a emissão da Permissão de Trabalho - PT;
c) desenvolver procedimento operacional para as atividades rotineiras de trabalho em altura;
d) assegurar a realização de avaliação prévia das condições no local do trabalho em altura, pelo estudo, planejamento e implementação das ações e das medidas complementares de segurança aplicáveis;
e) adotar as providências necessárias para acompanhar o cumprimento das medidas de proteção estabelecidas nesta Norma pelas empresas contratadas;
f) garantir aos trabalhadores informações atualizadas sobre os riscos e as medidas de controle;
g) garantir que qualquer trabalho em altura só se inicie depois de adotadas as medidas de proteção definidas nesta Norma;
h) assegurar a suspensão dos trabalhos em altura quando verificar situação ou condição de risco não prevista, cuja eliminação ou neutralização imediata não seja possível;
i) estabelecer uma sistemática de autorização dos trabalhadores para trabalho em altura;
j) assegurar que todo trabalho em altura seja realizado sob supervisão, cuja forma será definida pela análise de riscos de acordo com as peculiaridades da atividade;
k) assegurar a organização e o arquivamento da documentação prevista nesta Norma.

2.2 Cabe aos trabalhadores:

a) cumprir as disposições legais e regulamentares sobre trabalho em altura, inclusive os procedimentos expedidos pelo empregador;
b) colaborar com o empregador na implementação das disposições contidas nesta Norma;
c) interromper suas atividades exercendo o direito de recusa, sempre que constatarem evidências de riscos graves e iminentes para sua segurança e saúde ou a de outras pessoas, comunicando imediatamente o fato a seu superior hierárquico, que diligenciará as medidas cabíveis;
d) zelar pela sua segurança e saúde e a de outras pessoas que possam ser afetadas por suas ações ou omissões no trabalho.`,
};

export const mockUsers = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@saas.com",
    role: "admin" as const,
    subscription: {
      planId: "doutor-ho-anual",
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 305 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "active" as const,
      autoRenew: true,
    },
    registeredAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAccessAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hora atrás
    status: "active" as const,
    totalDocumentsViewed: 45,
    recentActivity: [
      {
        documentId: "1",
        documentTitle: "NR-01 - Disposições Gerais e Gerenciamento de Riscos",
        viewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        timeSpent: 15,
      },
      {
        documentId: "5",
        documentTitle: "NR-35 - Trabalho em Altura",
        viewedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        timeSpent: 25,
      },
    ],
  },
  {
    id: "2",
    name: "Regular User",
    email: "user@saas.com",
    role: "user" as const,
    subscription: {
      planId: "doutor-ho-anual",
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "active" as const,
      autoRenew: true,
    },
    registeredAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAccessAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 horas atrás
    status: "active" as const,
    totalDocumentsViewed: 28,
    recentActivity: [
      {
        documentId: "2",
        documentTitle: "NR-06 - Equipamentos de Proteção Individual",
        viewedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        timeSpent: 12,
      },
    ],
  },
  {
    id: "3",
    name: "João Silva",
    email: "joao.silva@empresa.com",
    role: "user" as const,
    subscription: {
      planId: "doutor-ho-anual",
      startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "active" as const,
      autoRenew: false,
    },
    registeredAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAccessAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
    status: "active" as const,
    totalDocumentsViewed: 12,
    recentActivity: [
      {
        documentId: "3",
        documentTitle: "NR-12 - Segurança no Trabalho em Máquinas e Equipamentos",
        viewedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        timeSpent: 8,
      },
    ],
  },
  {
    id: "4",
    name: "Maria Santos",
    email: "maria.santos@empresa.com",
    role: "user" as const,
    subscription: {
      planId: "doutor-ho-anual",
      startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "active" as const,
      autoRenew: true,
    },
    registeredAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAccessAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 horas atrás
    status: "active" as const,
    totalDocumentsViewed: 35,
    recentActivity: [
      {
        documentId: "4",
        documentTitle: "NR-17 - Ergonomia",
        viewedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        timeSpent: 20,
      },
      {
        documentId: "1",
        documentTitle: "NR-01 - Disposições Gerais e Gerenciamento de Riscos",
        viewedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        timeSpent: 10,
      },
    ],
  },
  {
    id: "5",
    name: "Pedro Costa",
    email: "pedro.costa@empresa.com",
    role: "user" as const,
    subscription: {
      planId: "doutor-ho-anual",
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expiryDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "expired" as const,
      autoRenew: false,
    },
    registeredAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAccessAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 dias atrás
    status: "inactive" as const,
    totalDocumentsViewed: 8,
    recentActivity: [],
  },
  {
    id: "6",
    name: "Ana Oliveira",
    email: "ana.oliveira@empresa.com",
    role: "user" as const,
    subscription: {
      planId: "doutor-ho-anual",
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "active" as const,
      autoRenew: true,
    },
    registeredAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAccessAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutos atrás
    status: "active" as const,
    totalDocumentsViewed: 52,
    recentActivity: [
      {
        documentId: "5",
        documentTitle: "NR-35 - Trabalho em Altura",
        viewedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        timeSpent: 18,
      },
      {
        documentId: "2",
        documentTitle: "NR-06 - Equipamentos de Proteção Individual",
        viewedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        timeSpent: 22,
      },
      {
        documentId: "3",
        documentTitle: "NR-12 - Segurança no Trabalho em Máquinas e Equipamentos",
        viewedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        timeSpent: 30,
      },
    ],
  },
  {
    id: "7",
    name: "Carlos Ferreira",
    email: "carlos.ferreira@empresa.com",
    role: "user" as const,
    subscription: {
      planId: "doutor-ho-anual",
      startDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: "active" as const,
      autoRenew: true,
    },
    registeredAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    lastAccessAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
    status: "active" as const,
    totalDocumentsViewed: 19,
    recentActivity: [
      {
        documentId: "1",
        documentTitle: "NR-01 - Disposições Gerais e Gerenciamento de Riscos",
        viewedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        timeSpent: 14,
      },
    ],
  },
];

// Forum Data
export const forumCategories = [
  {
    id: "duvidas",
    name: "Dúvidas",
    description: "Tire suas dúvidas sobre segurança do trabalho",
    icon: "HelpCircle",
    color: "blue",
  },
  {
    id: "legislacao",
    name: "Legislação",
    description: "Discussões sobre NRs e legislação trabalhista",
    icon: "FileText",
    color: "purple",
  },
  {
    id: "casos",
    name: "Casos de Sucesso",
    description: "Compartilhe experiências e boas práticas",
    icon: "Award",
    color: "green",
  },
  {
    id: "epis",
    name: "EPIs",
    description: "Tudo sobre equipamentos de proteção individual",
    icon: "Shield",
    color: "orange",
  },
  {
    id: "treinamentos",
    name: "Treinamentos",
    description: "Dicas e recursos para treinamentos",
    icon: "GraduationCap",
    color: "cyan",
  },
];

export const forumTopics = [
  {
    id: "1",
    title: "Como implementar NR-01 em pequenas empresas?",
    content: "Estou com dificuldade em implementar a NR-01 em uma empresa de pequeno porte. Quais são os primeiros passos e as principais exigências para empresas desse tamanho? Alguém tem um checklist ou modelo que possa compartilhar?",
    categoryId: "duvidas",
    authorId: "3",
    authorName: "João Silva",
    authorRole: "user" as const,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    views: 234,
    replies: 12,
    likes: 18,
    tags: ["NR-01", "pequenas empresas", "implementação"],
    isResolved: true,
    isPinned: false,
    isHot: true,
  },
  {
    id: "2",
    title: "Atualização da NR-12: Principais mudanças",
    content: "A NR-12 passou por atualizações recentes. Vamos discutir as principais mudanças e como adequar as empresas? Quem já implementou as novas exigências?",
    categoryId: "legislacao",
    authorId: "1",
    authorName: "Admin User",
    authorRole: "admin" as const,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    views: 456,
    replies: 24,
    likes: 42,
    tags: ["NR-12", "atualização", "legislação"],
    isResolved: false,
    isPinned: true,
    isHot: true,
  },
  {
    id: "3",
    title: "Redução de 80% em acidentes com novo programa de SST",
    content: "Compartilho nossa experiência: implementamos um programa integrado de SST e conseguimos reduzir acidentes em 80% no último ano. Vou detalhar o que fizemos...",
    categoryId: "casos",
    authorId: "6",
    authorName: "Ana Oliveira",
    authorRole: "user" as const,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    views: 892,
    replies: 31,
    likes: 76,
    tags: ["caso de sucesso", "redução de acidentes", "SST"],
    isResolved: false,
    isPinned: false,
    isHot: true,
  },
  {
    id: "4",
    title: "Qual EPI ideal para trabalho em altura?",
    content: "Preciso de recomendações de EPIs para trabalho em altura. Estamos montando uma nova equipe e queremos garantir a melhor proteção. Orçamento não é problema.",
    categoryId: "epis",
    authorId: "4",
    authorName: "Maria Santos",
    authorRole: "user" as const,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    views: 178,
    replies: 8,
    likes: 12,
    tags: ["EPI", "trabalho em altura", "NR-35"],
    isResolved: true,
    isPinned: false,
    isHot: false,
  },
  {
    id: "5",
    title: "Metodologias eficazes para treinamento de NR-35",
    content: "Quais metodologias vocês usam para treinamentos de NR-35? Estamos buscando tornar os treinamentos mais práticos e efetivos.",
    categoryId: "treinamentos",
    authorId: "7",
    authorName: "Carlos Ferreira",
    authorRole: "user" as const,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    views: 145,
    replies: 6,
    likes: 9,
    tags: ["treinamento", "NR-35", "metodologia"],
    isResolved: false,
    isPinned: false,
    isHot: false,
  },
];

export const forumPosts = [
  {
    id: "p1",
    topicId: "1",
    authorId: "1",
    authorName: "Admin User",
    authorRole: "admin" as const,
    content: "Ótima pergunta! Para pequenas empresas, recomendo começar com o PGR (Programa de Gerenciamento de Riscos). Os passos principais são:\n\n1. Identificar os perigos\n2. Avaliar os riscos\n3. Implementar medidas de controle\n4. Monitorar e revisar\n\nPosso compartilhar um modelo simplificado se precisar.",
    createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    likes: 15,
    isAnswer: true,
    isBestAnswer: true,
  },
  {
    id: "p2",
    topicId: "1",
    authorId: "6",
    authorName: "Ana Oliveira",
    authorRole: "user" as const,
    content: "Complementando a resposta do Admin, é importante também considerar o treinamento dos colaboradores. Na nossa empresa implementamos em 3 meses e o segredo foi envolver todos desde o início.",
    createdAt: new Date(Date.now() - 1.2 * 24 * 60 * 60 * 1000).toISOString(),
    likes: 8,
    isAnswer: true,
  },
];

// Notifications Data
export const mockNotifications = [
  {
    id: "n1",
    type: "forum" as const,
    title: "Nova resposta na sua discussão",
    message: "Admin User respondeu sua pergunta sobre NR-01",
    link: "/forum/1",
    isRead: false,
    priority: "medium" as const,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n2",
    type: "document" as const,
    title: "Novo documento disponível",
    message: "NR-01 - Disposições Gerais foi atualizada",
    link: "/",
    isRead: false,
    priority: "high" as const,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n3",
    type: "whatsapp" as const,
    title: "Entre no grupo de WhatsApp",
    message: "Participe da comunidade e tire dúvidas em tempo real",
    link: "/whatsapp-community",
    isRead: false,
    priority: "low" as const,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n4",
    type: "system" as const,
    title: "Seu plano vence em 30 dias",
    message: "Renove sua assinatura para continuar com acesso completo",
    link: "/plans",
    isRead: true,
    priority: "medium" as const,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n5",
    type: "announcement" as const,
    title: "Webinar gratuito sobre NR-12",
    message: "Inscreva-se para o webinar desta quinta-feira às 19h",
    link: "/announcements",
    isRead: true,
    priority: "low" as const,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n6",
    type: "forum" as const,
    title: "Seu tópico está em alta!",
    message: "Sua discussão sobre EPIs recebeu 50+ visualizações",
    link: "/forum/4",
    isRead: true,
    priority: "low" as const,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// WhatsApp Config
export const whatsappConfig = {
  phoneNumber: "5511999999999",
  countryCode: "55",
  welcomeMessage: "Olá! Bem-vindo à comunidade SafetyDocs. Como posso ajudar?",
  businessHours: "Segunda a Sexta, 8h às 18h",
  isOnline: true,
  groups: [
    {
      id: "g1",
      name: "Dúvidas Gerais",
      description: "Grupo para tirar dúvidas sobre segurança do trabalho",
      link: "https://chat.whatsapp.com/exemplo1",
    },
    {
      id: "g2",
      name: "Atualizações NRs",
      description: "Receba alertas sobre mudanças na legislação",
      link: "https://chat.whatsapp.com/exemplo2",
    },
    {
      id: "g3",
      name: "Networking SST",
      description: "Conecte-se com outros profissionais da área",
      link: "https://chat.whatsapp.com/exemplo3",
    },
  ],
};
