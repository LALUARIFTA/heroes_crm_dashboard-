// Sample data for a fresh browser session.
const DEFAULT_STATE = {
  theme: 'indigo',
  profile: {
    name: 'Alex Morgan',
    role: 'Sales Manager',
    email: 'alex.morgan@heroescrm.io.example',
    phone: '+1 (415) 555-0112',
    annualTarget: 1000000,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80'
  },
  dateRange: 'May 12 – May 18, 2025',
  dashFilters: { rep: 'ALL', stage: 'ALL', minVal: 0 },
  notifications: [
    { id: 'n1', title: 'NextGen Digital moved to Closed Won', sub: '$68,000 deal closed by Alex Morgan · 12m ago', icon: 'trophy', bg: 'bg-emerald-100 text-emerald-600', view: 'deals', unread: true },
    { id: 'n2', title: '4 new Enterprise leads assigned', sub: 'Inbound campaign "Q2 SaaS Summit" · 45m ago', icon: 'sparkles', bg: 'bg-indigo-100 text-indigo-600', view: 'leads', unread: true },
    { id: 'n3', title: 'Upcoming Call: BrightWave Ltd.', sub: 'Proposal follow-up at 10:00 AM · Today', icon: 'clock', bg: 'bg-amber-100 text-amber-600', view: 'calendar', unread: true }
  ],
  deals: [
    { id: 'd1', title: 'Enterprise Cloud Suite', company: 'BrightWave Ltd.', stage: 'Prospecting', value: 25000, owner: 'Alex Morgan', probability: 35, closeDate: '2025-06-15', color: '#4F46E5', notes: 'Initial discovery completed. Technical evaluation scheduled.' },
    { id: 'd2', title: 'Agency Growth License', company: 'Summit Agency', stage: 'Prospecting', value: 15000, owner: 'Jamie Carter', probability: 30, closeDate: '2025-06-22', color: '#10B981', notes: 'Looking for 25 seats with marketing automation.' },
    { id: 'd3', title: 'Core Analytics Add-on', company: 'HexaTech Co.', stage: 'Prospecting', value: 18000, owner: 'Taylor Brooks', probability: 40, closeDate: '2025-06-28', color: '#161433', notes: 'Requested security whitepaper and SOC2 report.' },
    { id: 'd4', title: 'Global Ops Expansion', company: 'TerraFirma Inc.', stage: 'Qualification', value: 30000, owner: 'Alex Morgan', probability: 55, closeDate: '2025-06-10', color: '#059669', notes: 'Demo feedback call set for 11:30 AM today.' },
    { id: 'd5', title: 'CRM Migration Package', company: 'BluePeak Corp.', stage: 'Qualification', value: 22000, owner: 'Jordan Lee', probability: 50, closeDate: '2025-06-18', color: '#0284C7', notes: 'Migrating from legacy spreadsheets.' },
    { id: 'd6', title: 'AI Workflow Engine', company: 'Nova Systems', stage: 'Qualification', value: 28000, owner: 'Morgan Riley', probability: 60, closeDate: '2025-06-25', color: '#2563EB', notes: 'VP of Sales actively sponsoring project.' },
    { id: 'd7', title: 'Multi-Region Platform', company: 'Vertex Solutions', stage: 'Proposal', value: 35000, owner: 'Alex Morgan', probability: 70, closeDate: '2025-05-30', color: '#7C3AED', notes: 'Proposal sent; contract discussion at 2:00 PM.' },
    { id: 'd8', title: 'CloudScale Annual Seat', company: 'CloudScale', stage: 'Proposal', value: 20000, owner: 'Jamie Carter', probability: 65, closeDate: '2025-06-04', color: '#3B82F6', notes: 'Reviewing annual discount tiers.' },
    { id: 'd9', title: 'Data Lab Integration', company: 'Insight Labs', stage: 'Proposal', value: 22000, owner: 'Taylor Brooks', probability: 68, closeDate: '2025-06-08', color: '#10B981', notes: 'API sandbox access granted to engineering.' },
    { id: 'd10', title: 'Venture Portfolio CRM', company: 'Elite Ventures', stage: 'Negotiation', value: 60000, owner: 'Alex Morgan', probability: 85, closeDate: '2025-05-24', color: '#1E1B4B', notes: 'Legal redlines almost finalized.' },
    { id: 'd11', title: 'Pioneer Enterprise Rollout', company: 'Pioneer Corp.', stage: 'Negotiation', value: 45000, owner: 'Jamie Carter', probability: 80, closeDate: '2025-05-27', color: '#F59E0B', notes: 'Negotiating 24-month payment terms.' },
    { id: 'd12', title: 'Network Sales Hub', company: 'Alpha Networks', stage: 'Negotiation', value: 40000, owner: 'Jordan Lee', probability: 78, closeDate: '2025-05-29', color: '#EF4444', notes: 'Final CFO sign-off pending.' },
    { id: 'd13', title: 'GlobalLink Command', company: 'GlobalLink Ltd.', stage: 'Closed Won', value: 55000, owner: 'Alex Morgan', probability: 100, closeDate: '2025-05-14', color: '#10B981', notes: 'Signed and onboarded successfully.' },
    { id: 'd14', title: 'InnovateX Revenue Suite', company: 'InnovateX', stage: 'Closed Won', value: 45000, owner: 'Jamie Carter', probability: 100, closeDate: '2025-05-15', color: '#4F46E5', notes: 'Onboarding call scheduled at 4:30 PM.' },
    { id: 'd15', title: 'NextGen Digital HQ', company: 'NextGen Digital', stage: 'Closed Won', value: 68000, owner: 'Alex Morgan', probability: 100, closeDate: '2025-05-16', color: '#0EA5E9', notes: 'Largest Q2 expansion deal.' }
  ],
  leads: [
    { id: 'l1', name: 'Elena Vance', company: 'BrightWave Ltd.', email: 'elena@brightwave.io.example', phone: '+1 (415) 555-0192', status: 'Qualified', source: 'Website', value: 25000, owner: 'Alex Morgan', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80' },
    { id: 'l2', name: 'Marcus Chen', company: 'TerraFirma Inc.', email: 'm.chen@terrafirma.com.example', phone: '+1 (212) 555-0148', status: 'Qualified', source: 'Referral', value: 30000, owner: 'Jamie Carter', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80' },
    { id: 'l3', name: 'Sophia Patel', company: 'Vertex Solutions', email: 'spatel@vertexsol.com.example', phone: '+1 (650) 555-0177', status: 'Contacted', source: 'LinkedIn', value: 35000, owner: 'Alex Morgan', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=160&q=80' },
    { id: 'l4', name: 'Liam O’Connor', company: 'CloudScale', email: 'liam@cloudscale.dev.example', phone: '+1 (408) 555-0181', status: 'New', source: 'Webinar', value: 20000, owner: 'Taylor Brooks', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80' },
    { id: 'l5', name: 'Amara Okafor', company: 'Elite Ventures', email: 'amara@elitevc.com.example', phone: '+1 (310) 555-0123', status: 'Qualified', source: 'Partner', value: 60000, owner: 'Alex Morgan', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80' },
    { id: 'l6', name: 'Daniel Kim', company: 'Nova Systems', email: 'dkim@novasys.io.example', phone: '+1 (206) 555-0199', status: 'Contacted', source: 'Outbound', value: 28000, owner: 'Jordan Lee', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=160&q=80' },
    { id: 'l7', name: 'Chloe Dubois', company: 'Summit Agency', email: 'chloe@summit.agency.example', phone: '+1 (305) 555-0133', status: 'Unqualified', source: 'Cold Email', value: 15000, owner: 'Morgan Riley', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80' },
    { id: 'l8', name: 'Noah Bennett', company: 'InnovateX', email: 'noah@innovatex.ai.example', phone: '+1 (512) 555-0164', status: 'New', source: 'Website', value: 45000, owner: 'Jamie Carter', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=160&q=80' }
  ],
  contacts: [
    { id: 'c1', name: 'Elena Vance', role: 'VP of Operations', company: 'BrightWave Ltd.', email: 'elena@brightwave.io.example', phone: '+1 (415) 555-0192', status: 'Active', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80' },
    { id: 'c2', name: 'Marcus Chen', role: 'Head of IT', company: 'TerraFirma Inc.', email: 'm.chen@terrafirma.com.example', phone: '+1 (212) 555-0148', status: 'Active', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80' },
    { id: 'c3', name: 'Sophia Patel', role: 'Chief Revenue Officer', company: 'Vertex Solutions', email: 'spatel@vertexsol.com.example', phone: '+1 (650) 555-0177', status: 'VIP', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=160&q=80' },
    { id: 'c4', name: 'Amara Okafor', role: 'Managing Partner', company: 'Elite Ventures', email: 'amara@elitevc.com.example', phone: '+1 (310) 555-0123', status: 'VIP', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80' },
    { id: 'c5', name: 'Liam O’Connor', role: 'Director of Engineering', company: 'CloudScale', email: 'liam@cloudscale.dev.example', phone: '+1 (408) 555-0181', status: 'Active', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80' },
    { id: 'c6', name: 'Noah Bennett', role: 'Founder & CEO', company: 'InnovateX', email: 'noah@innovatex.ai.example', phone: '+1 (512) 555-0164', status: 'Inactive', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=160&q=80' }
  ],
  accounts: [
    { id: 'a1', name: 'BrightWave Ltd.', industry: 'SaaS & Cloud', revenue: 4200000, employees: 180, status: 'Active', owner: 'Alex Morgan', location: 'San Francisco, US' },
    { id: 'a2', name: 'TerraFirma Inc.', industry: 'CleanTech', revenue: 8900000, employees: 340, status: 'Active', owner: 'Jamie Carter', location: 'New York, US' },
    { id: 'a3', name: 'Vertex Solutions', industry: 'Enterprise AI', revenue: 12500000, employees: 520, status: 'Enterprise', owner: 'Alex Morgan', location: 'Austin, US' },
    { id: 'a4', name: 'Elite Ventures', industry: 'FinTech', revenue: 28000000, employees: 95, status: 'Enterprise', owner: 'Alex Morgan', location: 'Los Angeles, US' },
    { id: 'a5', name: 'InnovateX', industry: 'Robotics', revenue: 6400000, employees: 210, status: 'Active', owner: 'Jamie Carter', location: 'Boston, US' },
    { id: 'a6', name: 'NextGen Digital', industry: 'Digital Media', revenue: 15100000, employees: 410, status: 'Enterprise', owner: 'Taylor Brooks', location: 'Chicago, US' }
  ],
  activities: [
    { id: 'act1', title: 'Email Opened', company: 'BrightWave Ltd.', type: 'Email', status: 'Completed', time: '2 min ago', owner: 'Alex Morgan', notes: 'Opened Q2 Enterprise Proposal 3 times.' },
    { id: 'act2', title: 'Document Viewed', company: 'TerraFirma Inc.', type: 'Document', status: 'Completed', time: '15 min ago', owner: 'Jamie Carter', notes: 'Reviewed Security & Compliance PDF.' },
    { id: 'act3', title: 'Brochure Downloaded', company: 'Summit Agency', type: 'Download', status: 'Completed', time: '1 hr ago', owner: 'Taylor Brooks', notes: 'Downloaded Agency Pricing Guide.' },
    { id: 'act4', title: 'Reply Received', company: 'Vertex Solutions', type: 'Email', status: 'In Progress', time: '2 hrs ago', owner: 'Alex Morgan', notes: 'Confirmed 2:00 PM contract review.' },
    { id: 'act5', title: 'Meeting Scheduled', company: 'CloudScale', type: 'Meeting', status: 'Scheduled', time: '3 hrs ago', owner: 'Jordan Lee', notes: 'Technical architecture walkthrough.' }
  ],
  meetings: [
    { id: 'm1', time: '10:00 AM', date: '2025-05-15', company: 'BrightWave Ltd.', title: 'Proposal follow-up', type: 'Call', status: 'Scheduled', owner: 'Alex Morgan', phone: '+1 (415) 555-0192' },
    { id: 'm2', time: '11:30 AM', date: '2025-05-15', company: 'TerraFirma Inc.', title: 'Demo feedback call', type: 'Meeting', status: 'Scheduled', owner: 'Jamie Carter', phone: '+1 (212) 555-0148' },
    { id: 'm3', time: '2:00 PM', date: '2025-05-15', company: 'Vertex Solutions', title: 'Contract discussion', type: 'Call', status: 'Confirmed', owner: 'Alex Morgan', phone: '+1 (650) 555-0177' },
    { id: 'm4', time: '4:30 PM', date: '2025-05-15', company: 'InnovateX', title: 'Onboarding call', type: 'Meeting', status: 'Confirmed', owner: 'Taylor Brooks', phone: '+1 (512) 555-0164' },
    { id: 'm5', time: '1:00 PM', date: '2025-05-18', company: 'Elite Ventures', title: 'Legal Redline Sign-off', type: 'Meeting', status: 'Scheduled', owner: 'Alex Morgan', phone: '+1 (310) 555-0123' }
  ],
  products: [
    { id: 'p1', name: 'Heroes CRM Enterprise', sku: 'HCRM-ENT-01', category: 'SaaS License', price: 1200, stock: 'Unlimited', status: 'Active', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80' },
    { id: 'p2', name: 'AI Revenue Intelligence', sku: 'HCRM-AI-02', category: 'Add-on', price: 490, stock: 'Unlimited', status: 'Active', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80' },
    { id: 'p3', name: 'Omnichannel Dialer Pro', sku: 'HCRM-VOIP-03', category: 'Integration', price: 290, stock: 'Unlimited', status: 'Active', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80' },
    { id: 'p4', name: 'Dedicated Onboarding Pack', sku: 'HCRM-SVC-04', category: 'Service', price: 3500, stock: '12 Slots', status: 'Draft', image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=400&q=80' }
  ],
  documents: [
    { id: 'doc1', name: 'Heroes CRM Q2 Enterprise Proposal.pdf', company: 'BrightWave Ltd.', category: 'Proposal', size: '2.4 MB', updated: '2025-05-15', status: 'Sent', summary: 'Full 12-month enterprise deployment covering 50 seats, AI Revenue Intelligence, and dedicated SLA support. Total value: $25,000.' },
    { id: 'doc2', name: 'SOC2 Type II Security Whitepaper.pdf', company: 'TerraFirma Inc.', category: 'Compliance', size: '4.1 MB', updated: '2025-05-14', status: 'Viewed', summary: 'Independent audit attestation covering encryption at rest (AES-256), SSO/SAML 2.0, and GDPR data residency controls.' },
    { id: 'doc3', name: 'Master Services Agreement v4.docx', company: 'Vertex Solutions', category: 'Contract', size: '840 KB', updated: '2025-05-13', status: 'Signed', summary: 'Executed Master Services Agreement for Multi-Region Platform rollout ($35,000 ARR).' },
    { id: 'doc4', name: 'Agency Growth Pricing Deck.pdf', company: 'Summit Agency', category: 'Brochure', size: '5.8 MB', updated: '2025-05-12', status: 'Viewed', summary: 'Volume discount schedule and agency partner co-marketing benefits.' }
  ],
  team: [
    { id: 't1', name: 'Alex Morgan', role: 'Sales Manager', revenue: 152500, target: 150000, dealsClosed: 18, winRate: '34%', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80' },
    { id: 't2', name: 'Jamie Carter', role: 'Senior AE', revenue: 118900, target: 135000, dealsClosed: 14, winRate: '29%', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80' },
    { id: 't3', name: 'Taylor Brooks', role: 'Account Executive', revenue: 96400, target: 125000, dealsClosed: 11, winRate: '26%', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=160&q=80' },
    { id: 't4', name: 'Jordan Lee', role: 'Account Executive', revenue: 84700, target: 130000, dealsClosed: 9, winRate: '24%', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80' },
    { id: 't5', name: 'Morgan Riley', role: 'SDR Lead', revenue: 72300, target: 135000, dealsClosed: 8, winRate: '21%', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=160&q=80' }
  ]
};
