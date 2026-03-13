// src/core/classifier.js

const DOMAINS = {
  software: 'code programming function variable class method api endpoint database query sql server deploy docker kubernetes container git commit branch merge pull request refactor debug test unit integration framework library package module import export typescript javascript python rust golang java react vue angular node npm webpack vite eslint prettier ci cd pipeline build compile runtime error exception stack trace algorithm data structure array object hash map set queue linked list tree graph recursion iteration loop async await promise callback event handler middleware router controller service repository pattern design architecture microservice monolith rest graphql websocket http request response header cookie session token jwt oauth',

  security: 'vulnerability exploit attack vector threat model authentication authorization encryption cipher hash salt bcrypt argon2 token session csrf xss sql injection command injection path traversal directory traversal privilege escalation lateral movement persistence exfiltration ransomware malware phishing social engineering firewall ids ips waf siem soc incident response forensic penetration testing red team blue team purple team zero day patch cve cvss owasp compliance audit certificate tls ssl https pki key management secret rotation credential password mfa totp fido',

  data_science: 'machine learning deep learning neural network model training inference dataset feature engineering preprocessing normalization embedding vector transformer attention mechanism gradient descent loss function optimizer epoch batch size hyperparameter tuning cross validation accuracy precision recall f1 score confusion matrix classification regression clustering dimensionality reduction pca tsne reinforcement learning gan generative adversarial network nlp natural language processing tokenization sentiment analysis named entity recognition computer vision image recognition object detection segmentation pytorch tensorflow keras scikit learn pandas numpy matplotlib',

  devops: 'deployment infrastructure cloud aws azure gcp terraform ansible puppet chef docker kubernetes helm istio service mesh monitoring observability prometheus grafana datadog logging elk stack elasticsearch kibana fluentd alerting pagerduty incident management sla slo sli uptime availability latency throughput scaling horizontal vertical autoscaling load balancer reverse proxy nginx apache cdn cache redis memcached queue rabbitmq kafka message broker event driven serverless lambda function edge computing',

  business: 'revenue profit margin growth strategy market share competitive advantage customer acquisition retention churn rate conversion funnel sales pipeline lead generation marketing campaign brand positioning pricing model subscription saas freemium enterprise deal contract negotiation partnership stakeholder investor pitch deck fundraising valuation equity dilution board meeting quarterly review okr kpi metric dashboard report analytics roi budget forecast projection',

  design: 'user experience interface wireframe prototype mockup figma sketch adobe illustrator photoshop typography color palette layout grid spacing alignment responsive adaptive mobile first breakpoint component library design system atomic design accessibility wcag aria screen reader contrast ratio usability testing user research persona journey map information architecture navigation sitemap card sorting tree testing heuristic evaluation',

  legal: 'contract agreement terms conditions privacy policy compliance regulation gdpr ccpa hipaa sox pci dss intellectual property patent trademark copyright trade secret nda non compete arbitration litigation settlement liability indemnification warranty disclaimer license open source gpl mit apache creative commons',

  finance: 'accounting ledger balance sheet income statement cash flow revenue expense depreciation amortization tax deduction credit debit invoice payment billing subscription recurring revenue arr mrr burn rate runway valuation cap table stock option vesting cliff exercise price strike price',

  writing: 'article blog post essay documentation guide tutorial readme changelog release notes technical writing copy editing proofreading style guide tone voice audience narrative structure outline draft revision feedback review publish content strategy seo keyword meta description heading paragraph link anchor',

  education: 'learning teaching curriculum lesson plan course module lecture assignment quiz exam grade rubric student teacher professor tutor mentor coaching training workshop bootcamp certification degree diploma accreditation online learning mooc video tutorial interactive exercise practice problem solution explanation concept theory principle',

  research: 'hypothesis experiment methodology literature review peer review citation reference bibliography abstract conclusion finding result analysis statistical significance p value sample size control group variable dependent independent qualitative quantitative survey interview observation case study longitudinal cross sectional meta analysis systematic review',
};

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
  'dare', 'ought', 'used', 'this', 'that', 'these', 'those', 'i', 'me',
  'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they',
  'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who',
  'whom', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

function computeTF(tokens) {
  const tf = new Map();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  const total = tokens.length || 1;
  for (const [k, v] of tf) {
    tf.set(k, v / total);
  }
  return tf;
}

function computeIDF(allTokenSets) {
  const idf = new Map();
  const n = allTokenSets.length;
  const df = new Map();
  for (const tokenSet of allTokenSets) {
    for (const t of tokenSet) {
      df.set(t, (df.get(t) || 0) + 1);
    }
  }
  for (const [t, freq] of df) {
    idf.set(t, Math.log(n / (freq + 1)) + 1);
  }
  return idf;
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0, magA = 0, magB = 0;
  const allKeys = new Set([...vecA.keys(), ...vecB.keys()]);
  for (const k of allKeys) {
    const a = vecA.get(k) || 0;
    const b = vecB.get(k) || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export function createClassifier() {
  const domainTokens = {};
  const allTokenSets = [];

  for (const [name, keywords] of Object.entries(DOMAINS)) {
    const tokens = tokenize(keywords);
    domainTokens[name] = tokens;
    allTokenSets.push(new Set(tokens));
  }

  const idf = computeIDF(allTokenSets);

  // Pre-compute TF-IDF vectors for each domain
  const domainVectors = {};
  for (const [name, tokens] of Object.entries(domainTokens)) {
    const tf = computeTF(tokens);
    const tfidf = new Map();
    for (const [term, tfVal] of tf) {
      tfidf.set(term, tfVal * (idf.get(term) || 1));
    }
    domainVectors[name] = tfidf;
  }

  return { domainVectors, idf };
}

export function classify(model, text, topN = 3) {
  if (!text || typeof text !== 'string') return [];

  const tokens = tokenize(text);
  if (tokens.length === 0) return [];

  const tf = computeTF(tokens);
  const queryVector = new Map();
  for (const [term, tfVal] of tf) {
    queryVector.set(term, tfVal * (model.idf.get(term) || 1));
  }

  const scores = [];
  for (const [name, vec] of Object.entries(model.domainVectors)) {
    const sim = cosineSimilarity(queryVector, vec);
    if (sim > 0) scores.push([name, sim]);
  }

  scores.sort((a, b) => b[1] - a[1]);

  // Normalize scores to 0-1 range
  if (scores.length > 0) {
    const maxScore = scores[0][1];
    if (maxScore > 0) {
      for (const entry of scores) {
        entry[1] = entry[1] / maxScore;
      }
    }
  }

  return scores.slice(0, topN);
}
