// AI Chatbot Service for PawaVotes - Comprehensive System Knowledge
// Updated with all platform functionalities

interface Intent {
  name: string;
  patterns: string[];
  responses: string[];
  confidence: number;
}

// Part 1: Core intents array initialization
const intents: Intent[] = [
  // GREETINGS
  {
    name: 'greeting',
    patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
    responses: [
      'Hello! Welcome to PawaVotes - Africa\'s trusted digital voting platform. How can I help you today?',
      'Hi there! I\'m here to assist you with voting, awards, and elections. What can I do for you?',
    ],
    confidence: 0.9,
  },
  
  {
    name: 'what_is_pawavotes',
    patterns: ['what is pawavotes', 'about pawavotes', 'tell me about', 'what do you do'],
    responses: [
      'PawaVotes is Africa\'s trusted digital voting platform for:\n🏆 Public Awards\n🗳️ Institutional Elections\n📱 Multi-Channel (Web/USSD/Mobile)\n📊 Real-Time Results',
    ],
    confidence: 0.95,
  },

  // PUBLIC VOTING
  {
    name: 'how_to_vote_public',
    patterns: ['how to vote', 'how do i vote', 'voting process', 'cast vote', 'vote for'],
    responses: [
      'To vote:\n\n🌐 Web Voting:\n1. Visit voting page\n2. Select award & category\n3. Pick nominee\n4. Enter vote quantity (GHS 0.50/vote)\n5. Pay via Mobile Money\n6. Get instant confirmation!\n\n📱 USSD Voting:\nDial *928*121# from any phone\n\nBoth methods work instantly!',
    ],
    confidence: 0.95,
  },

  {
    name: 'ussd_voting',
    patterns: ['ussd', 'ussd code', 'dial code', 'shortcode', 'phone voting', '*928*121#', '928'],
    responses: [
      'USSD Voting - Dial *928*121#\n\n📱 Dial *928*121# from any phone\n📋 Follow the menu:\n  • Select Award\n  • Choose Category\n  • Pick Nominee\n  • Enter vote quantity\n  • Approve payment\n\n✅ Works on MTN, Telecel, AirtelTigo\n✅ No internet needed\n✅ OTP entry within USSD\n✅ Instant confirmation\n\nPerfect for voters without smartphones!',
    ],
    confidence: 0.95,
  },

  {
    name: 'payment_methods',
    patterns: ['payment', 'pay', 'mobile money', 'momo', 'how to pay', 'payment options'],
    responses: [
      'Payment Methods:\n• Mobile Money (MTN, Telecel, AirtelTigo)\n• USSD payments\n• Hubtel secure payment integration\n\nAll payments are secure and instant!',
    ],
    confidence: 0.9,
  },

  {
    name: 'vote_cost',
    patterns: ['how much', 'cost', 'price', 'vote price', 'how much per vote'],
    responses: [
      'Vote Pricing:\n• Typically GHS 0.50 per vote\n• Bulk packages available\n• Prices set by organizers\n\nCheck specific award page for exact pricing.',
    ],
    confidence: 0.85,
  },

  // INSTITUTIONAL ELECTIONS
  {
    name: 'institutional_elections',
    patterns: ['institutional election', 'school election', 'church election', 'organization election', 'private voting'],
    responses: [
      'Institutional Elections:\n🎓 Schools & Universities\n⛪ Churches & Religious Orgs\n🏢 Companies & Associations\n\nFeatures:\n✅ Unique voter credentials\n✅ Email/SMS delivery\n✅ Secure login portal\n✅ Position-based voting\n✅ Controlled result release',
    ],
    confidence: 0.9,
  },

  {
    name: 'voter_credentials',
    patterns: ['voter credentials', 'voter id', 'voting password', 'how to login', 'election login'],
    responses: [
      'Voter Credentials:\n📧 Sent via email or SMS\n🆔 Unique Voter ID\n🔐 Secure password\n\nTo vote:\n1. Check your email/SMS\n2. Visit election portal\n3. Login with credentials\n4. Cast your ballot\n5. Submit & confirm',
    ],
    confidence: 0.9,
  },

  // ORGANIZER FEATURES
  {
    name: 'create_award',
    patterns: ['create award', 'organize award', 'host award', 'start award', 'new award', 'setup award', 'organize event', 'want to organize', 'i want to create', 'how to organize', 'how to create award'],
    responses: [
      'Want to Organize an Award?\n\n📋 To set up an award event, please contact our team:\n\n📧 Email: pawavotes@gmail.com\n📧 Sales: sales@pawavotes.com\n📞 Phone: +233 55 273 2025\n📞 Phone: +233 54 319 4406\n\nOr use the contact form on our website!\n\nOur team will:\n✅ Set up your organization account\n✅ Configure your award event\n✅ Provide training & support\n✅ Help you get started quickly',
    ],
    confidence: 0.9,
  },

  {
    name: 'create_election',
    patterns: ['create election', 'setup election', 'organize election', 'host election', 'new election', 'institutional voting', 'want to create election', 'how to setup election', 'i want to organize election'],
    responses: [
      'Want to Organize an Election?\n\n📋 To set up an institutional election, please contact our team:\n\n📧 Email: pawavotes@gmail.com\n📧 Sales: sales@pawavotes.com\n📞 Phone: +233 55 273 2025\n📞 Phone: +233 54 319 4406\n\nOr use the contact form on our website!\n\nPerfect for:\n🎓 Schools & Universities\n⛪ Churches & Religious Organizations\n🏢 Companies & Associations\n🏛️ Clubs & Societies\n\nOur team will help you set everything up!',
    ],
    confidence: 0.9,
  },

  {
    name: 'become_organizer',
    patterns: ['become organizer', 'sign up organizer', 'register organization', 'get started', 'how to start', 'join as organizer'],
    responses: [
      'Become an Event Organizer!\n\n📝 To get started with PawaVotes:\n\n1️⃣ Contact our team:\n📧 pawavotes@gmail.com\n📧 sales@pawavotes.com\n📞 +233 55 273 2025\n\nOr fill out the contact form on our website!\n\n2️⃣ Our team will:\n✅ Create your organization account\n✅ Set up your first event\n✅ Provide platform training\n✅ Offer ongoing support\n\nWe make it easy to get started!',
    ],
    confidence: 0.9,
  },

  {
    name: 'add_voters',
    patterns: ['add voters', 'upload voters', 'voter list', 'import voters', 'bulk voters'],
    responses: [
      'Add Voters:\n📋 Manual Entry - Add one by one\n📁 CSV Upload - Bulk import\n\nRequired info:\n• Full name\n• Email address\n• Phone number (optional)\n\nSystem automatically:\n✅ Generates unique credentials\n✅ Sends via email/SMS\n✅ Tracks delivery status',
    ],
    confidence: 0.9,
  },

  // NOMINEES & CANDIDATES
  {
    name: 'nominee_submission',
    patterns: ['nominate', 'submit nominee', 'add nominee', 'nomination', 'become nominee'],
    responses: [
      'Submit Nomination:\n1. Visit award page\n2. Click "Submit Nomination"\n3. Fill nominee details\n4. Upload photo/documents\n5. Submit for review\n\nOrganizer reviews and approves. Approved nominees get unique codes!',
    ],
    confidence: 0.9,
  },

  {
    name: 'nominee_approval',
    patterns: ['approve nominee', 'nominee approval', 'pending nominees', 'review nominations'],
    responses: [
      'Nominee Approval (Organizers):\n📋 Dashboard > Nominees\n👀 Review submissions\n✅ Approve or reject\n📧 Auto-email notification\n🔢 Assign nominee codes\n\nApproved nominees appear on voting page!',
    ],
    confidence: 0.85,
  },

  // RESULTS & ANALYTICS
  {
    name: 'check_results',
    patterns: ['results', 'who won', 'winner', 'check results', 'voting results', 'leaderboard'],
    responses: [
      'Check Results:\n🏆 Public Awards - Live leaderboard\n🗳️ Elections - Results dashboard after voting ends\n\nFeatures:\n✅ Real-time vote counts\n✅ Percentage breakdowns\n✅ Visual charts\n✅ Export to CSV\n\nOrganizers control result visibility!',
    ],
    confidence: 0.9,
  },

  {
    name: 'analytics',
    patterns: ['analytics', 'statistics', 'voting stats', 'dashboard', 'reports'],
    responses: [
      'Analytics Dashboard:\n📊 Real-time vote tracking\n💰 Revenue monitoring\n👥 Voter participation\n📈 Trend analysis\n📥 Export reports\n🕐 Hourly/daily breakdowns\n\nAccess: Dashboard > Analytics',
    ],
    confidence: 0.85,
  },

  {
    name: 'revenue_tracking',
    patterns: ['revenue', 'earnings', 'money earned', 'income', 'payment tracking'],
    responses: [
      'Revenue Tracking:\n💵 Total revenue\n📊 Per-category breakdown\n💳 Payment method stats\n📈 Growth trends\n💸 Service fees\n🏦 Withdrawal requests\n\nView: Dashboard > Analytics > Revenue',
    ],
    confidence: 0.85,
  },

  // PAYMENT ISSUES
  {
    name: 'payment_failed',
    patterns: ['payment failed', 'transaction failed', 'payment not working', 'cant pay', 'payment error'],
    responses: [
      'Payment Failed?\n\n1️⃣ Check mobile money balance\n2️⃣ Ensure number is registered\n3️⃣ Approve payment on phone (*170# for MTN)\n4️⃣ Try different network\n5️⃣ Contact network provider\n\nStill stuck? Email: pawavotes@gmail.com',
    ],
    confidence: 0.85,
  },

  {
    name: 'otp_payment',
    patterns: ['otp', 'enter otp', 'otp code', 'payment otp', 'otp not received'],
    responses: [
      'OTP Payment:\n📱 OTP sent to your phone\n⌨️ Enter in USSD or web\n🔄 3 attempts allowed\n⏱️ Valid for 5 minutes\n\nNot received?\n• Check network signal\n• Wait 1-2 minutes\n• Try again\n• Contact network: *170# (MTN)',
    ],
    confidence: 0.85,
  },

  {
    name: 'offline_payment',
    patterns: ['offline payment', 'approve payment', 'pending payment', '*170#', 'my approvals'],
    responses: [
      'Offline Payment Approval:\n\n📱 MTN: Dial *170# > My Approvals\n📱 Telecel: Dial *110# > Pending Payments\n📱 AirtelTigo: Check phone for approval\n\nApprove the payment to complete your vote!',
    ],
    confidence: 0.85,
  },

  // TROUBLESHOOTING
  {
    name: 'vote_not_counted',
    patterns: ['vote not counted', 'vote missing', 'didnt receive vote', 'vote not showing'],
    responses: [
      'Vote Not Showing?\n\n✅ Check payment was successful\n⏱️ Wait 2-3 minutes for processing\n📧 Check email confirmation\n🔍 Verify payment reference\n\nStill missing? Contact support with:\n• Payment reference\n• Phone number\n• Time of vote',
    ],
    confidence: 0.85,
  },

  {
    name: 'duplicate_voting',
    patterns: ['vote twice', 'multiple votes', 'vote again', 'can i vote multiple times'],
    responses: [
      'Duplicate Voting:\n\n❌ One vote per voter per position/category\n✅ Can buy multiple votes at once\n✅ Can vote in different categories\n❌ Cannot vote twice with same credentials\n\nSystem prevents duplicate voting automatically!',
    ],
    confidence: 0.85,
  },

  {
    name: 'refund',
    patterns: ['refund', 'money back', 'return payment', 'cancel vote', 'get refund'],
    responses: [
      'Refund Policy:\n\n❌ Votes are final once confirmed\n✅ Refunds only for technical errors\n📧 Contact: pawavotes@gmail.com\n📋 Include payment reference\n⏱️ Processing: 5-7 business days\n\nWe review each case individually.',
    ],
    confidence: 0.8,
  },

  // FEATURES & CAPABILITIES
  {
    name: 'stage_management',
    patterns: ['stages', 'voting stages', 'nomination stage', 'voting period', 'stage management'],
    responses: [
      'Stage Management:\n\n📝 Nomination Stage - Accept submissions\n🗳️ Voting Stage - Active voting\n🏆 Results Stage - Show winners\n\nOrganizers control:\n✅ Start/end dates & times\n✅ Stage transitions\n✅ Visibility settings\n\nDashboard > Stages',
    ],
    confidence: 0.85,
  },

  {
    name: 'bulk_voting',
    patterns: ['bulk votes', 'vote packages', 'buy many votes', 'multiple votes', 'vote bundle'],
    responses: [
      'Bulk Voting:\n\n💰 Buy multiple votes at once\n📦 Packages available\n💵 Discounts for bulk purchases\n⚡ Single payment transaction\n\nEnter desired quantity when voting. All votes count for same nominee!',
    ],
    confidence: 0.85,
  },

  {
    name: 'helpdesk',
    patterns: ['helpdesk', 'help desk', 'support portal', 'voter support', 'helpdesk login'],
    responses: [
      'Helpdesk Portal:\n\n🎧 For election support staff\n🔍 Search voters\n📧 Resend credentials\n✅ Verify voter status\n📊 View voter activity\n\nAccess: /helpdesk-login\nOrganizers can create helpdesk accounts.',
    ],
    confidence: 0.85,
  },

  // SECURITY & PRIVACY
  {
    name: 'security',
    patterns: ['security', 'secure', 'safe', 'is it safe', 'data protection', 'privacy'],
    responses: [
      'Security Features:\n\n🔐 Encrypted connections (HTTPS)\n🔑 Unique voter credentials\n🚫 Duplicate prevention\n📝 Audit trails\n💳 Secure payment (Hubtel)\n🔒 Data protection\n\nYour vote and data are completely secure!',
    ],
    confidence: 0.85,
  },

  {
    name: 'transparency',
    patterns: ['transparent', 'transparency', 'audit', 'verify votes', 'trust'],
    responses: [
      'Transparency:\n\n✅ Real-time vote counts\n✅ Audit trails\n✅ Payment records\n✅ Voter activity logs\n✅ Export capabilities\n✅ Timestamp tracking\n\nOrganizers can audit everything!',
    ],
    confidence: 0.85,
  },

  // CONTACT & SUPPORT
  {
    name: 'contact_support',
    patterns: ['contact', 'support', 'help', 'customer service', 'talk to human', 'reach out'],
    responses: [
      'Contact Support:\n\n📧 Email: pawavotes@gmail.com\n📧 Sales: sales@pawavotes.com\n📞 Phone: +233 55 273 2025\n📞 Phone: +233 54 319 4406\n📍 Office: Asafo, O.A Street, Kumasi\n\n⏰ Hours: Mon-Fri, 8AM-6PM GMT\n\nOr use contact form on website!',
    ],
    confidence: 0.9,
  },

  {
    name: 'pricing_inquiry',
    patterns: ['pricing', 'how much to organize', 'cost to create', 'platform fee', 'service charge'],
    responses: [
      'Platform Pricing:\n\n🏆 Public Awards:\n• Set your own vote price\n• Platform service fee applies\n• Revenue tracking included\n\n🗳️ Institutional Elections:\n• Contact for custom quote\n• Based on voter count\n• Full feature access\n\nEmail: sales@pawavotes.com',
    ],
    confidence: 0.85,
  },

  {
    name: 'thank_you',
    patterns: ['thank you', 'thanks', 'appreciate', 'helpful', 'great'],
    responses: [
      'You\'re welcome! Happy to help. Feel free to ask if you have more questions! 😊',
      'Glad I could help! Enjoy using PawaVotes! 🎉',
      'My pleasure! Let me know if you need anything else. 👍',
    ],
    confidence: 0.9,
  },

  {
    name: 'goodbye',
    patterns: ['bye', 'goodbye', 'see you', 'later', 'exit'],
    responses: [
      'Goodbye! Thanks for using PawaVotes. Have a great day! 👋',
      'See you later! Feel free to come back anytime. 😊',
    ],
    confidence: 0.9,
  },
];

// Intent detection function
export function detectIntent(message: string): { intent: string; confidence: number; response: string } {
  const lowerMessage = message.toLowerCase();
  
  let bestMatch: Intent | null = null;
  let highestScore = 0;

  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      if (lowerMessage.includes(pattern.toLowerCase())) {
        const score = intent.confidence * (pattern.length / lowerMessage.length);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = intent;
        }
      }
    }
  }

  if (bestMatch && highestScore > 0.3) {
    const response = bestMatch.responses[Math.floor(Math.random() * bestMatch.responses.length)];
    return {
      intent: bestMatch.name,
      confidence: highestScore,
      response,
    };
  }

  // Default response for unknown queries
  return {
    intent: 'unknown',
    confidence: 0,
    response: generateUnknownResponse(),
  };
}

function generateUnknownResponse(): string {
  return `I'm not sure I understand. Could you rephrase that?\n\n💡 Try asking about:\n• How to vote\n• Creating awards/elections\n• Payment methods\n• USSD voting\n• Results & analytics\n• Voter credentials\n• Support contact\n\nOr type "help" for more options!`;
}

// Help message generator
export function generateHelpMessage(): string {
  return `🤖 PawaVotes Assistant - I can help with:

📊 **VOTING**
• How to vote (Web or USSD: *928*121#)
• Payment methods & pricing
• Nominee codes & quick voting
• Vote tracking & confirmation

🏆 **ORGANIZE AWARDS**
• Contact us to set up your award
• Email: pawavotes@gmail.com
• Phone: +233 55 273 2025

🗳️ **ORGANIZE ELECTIONS**
• Contact us to set up your election
• Perfect for schools, churches, companies
• Email: sales@pawavotes.com

💰 **PAYMENTS**
• Mobile money (MTN, Telecel, AirtelTigo)
• OTP handling
• Payment issues
• Refund policy

📈 **RESULTS**
• Real-time leaderboards
• Vote tracking
• Analytics & reports
• Export data

🔐 **SECURITY**
• Data protection
• Audit trails
• Transparency
• Duplicate prevention

📞 **SUPPORT**
• Contact: pawavotes@gmail.com
• Phone: +233 55 273 2025 / +233 54 319 4406
• Office: Asafo, O.A Street, Kumasi

Just ask me anything! I'm here to help 24/7! 😊`;
}
