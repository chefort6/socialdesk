const dashboardRepo = require("./dashboard.repository");

const formatNumber = (num) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

const mapPlatform = (code) => {
  const map = {
    "facebook": "Facebook",
    "instagram": "Instagram",
    "tiktok": "Tiktok",
    "youtube": "YouTube",
    "pinterest": "Pinterest",
    "x": "X"
  };
  return map[code?.toLowerCase()] || code;
};

const getPlatformColor = (code) => {
  const map = {
    "facebook": "#1877f2",
    "instagram": "#dd2a7b",
    "tiktok": "#010101",
    "youtube": "#ff0000",
    "pinterest": "#e60023",
    "x": "#000000"
  };
  return map[code?.toLowerCase()] || "#94a3b8";
};

const getAccountColor = (i) => {
  const colors = ["#22c55e", "#60a5fa", "#818cf8", "#f43f5e", "#f59e0b", "#8b5cf6"];
  return colors[i % colors.length];
};

exports.getOverview = async (userId) => {
  const connectedAccounts = await dashboardRepo.getConnectedAccounts(userId);
  const accountIds = connectedAccounts.map(a => a.id);
  
  const scheduledPostsRaw = await dashboardRepo.getScheduledPosts(userId);
  const analytics = await dashboardRepo.getAccountAnalytics(accountIds);
  const engagement = await dashboardRepo.getRecentEngagement(accountIds);
  
  const formattedConnectedAccounts = connectedAccounts.map(a => ({
    platform: mapPlatform(a.platforms?.code),
    name: mapPlatform(a.platforms?.code),
    handle: a.username || a.display_name || "Unknown"
  }));

  const formattedScheduledPosts = scheduledPostsRaw.map(p => {
    const target = p.post_targets?.[0];
    const acc = target?.social_accounts;
    const platformName = mapPlatform(acc?.platforms?.code);
    
    const d = new Date(p.scheduled_at);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
                   ' · ' + 
                   d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                   
    return {
      title: p.title || "Draft Post",
      account: acc?.display_name || acc?.username || "Unknown",
      aColor: getPlatformColor(acc?.platforms?.code),
      date: dateStr,
      platform: platformName
    };
  });

  const accPerfMap = {};
  analytics.forEach(stat => {
    const acc = connectedAccounts.find(a => a.id === stat.social_account_id);
    if (!acc) return;
    
    const accName = acc.display_name || acc.username || "Account";
    if (!accPerfMap[accName]) {
      accPerfMap[accName] = { name: accName, pairs: [] };
    }
    
    accPerfMap[accName].pairs.push({
      plt: mapPlatform(acc.platforms?.code),
      val: formatNumber(stat.followers_count || 0),
      delta: "0%", 
      up: true
    });
  });

  const accountPerformance = Object.values(accPerfMap).map((item, i) => ({
    ...item,
    color: getAccountColor(i)
  }));

  const summaryPages = analytics.map(stat => {
    const acc = connectedAccounts.find(a => a.id === stat.social_account_id);
    const totalEngagement = (stat.total_likes || 0) + (stat.total_comments || 0) + (stat.total_shares || 0);
    const platformName = mapPlatform(acc?.platforms?.code);
    const thirdLabel = platformName === "YouTube" || platformName === "Tiktok" ? "Views" : "Reach";
    const thirdVal = stat.total_views || stat.total_reach || 0;
    
    return {
      name: acc?.display_name || acc?.username || "Account",
      plt: platformName,
      engagement: formatNumber(totalEngagement),
      third: formatNumber(thirdVal),
      thirdLabel: thirdLabel,
      posts: (stat.total_posts || 0).toString(),
      avgLikes: Math.round(stat.total_likes / (stat.total_posts || 1)).toString(),
      engRate: stat.engagement_rate ? parseFloat(stat.engagement_rate) : 0
    };
  });

  const engagementData = engagement.map(e => {
    const title = e.post_targets?.posts?.title || "Unknown Post";
    const accId = e.post_targets?.social_account_id;
    const acc = connectedAccounts.find(a => a.id === accId);
    
    return {
      plt: mapPlatform(acc?.platforms?.code),
      post: title,
      likes: e.likes || 0,
      comments: e.comments || 0,
      shares: e.shares || 0,
      total: (e.likes || 0) + (e.comments || 0) + (e.shares || 0)
    };
  });

  let totalFollowers = 0;
  let totalPosts = 0;
  const followersData = [];
  const postedData = [];
  
  analytics.forEach(stat => {
    const acc = connectedAccounts.find(a => a.id === stat.social_account_id);
    totalFollowers += (stat.followers_count || 0);
    totalPosts += (stat.total_posts || 0);
    
    const pltName = mapPlatform(acc?.platforms?.code);
    followersData.push({ plt: pltName, val: formatNumber(stat.followers_count || 0) });
    postedData.push({ plt: pltName, val: stat.total_posts || 0 });
  });

  const kpis = {
    total_followers: formatNumber(totalFollowers),
    total_posts: formatNumber(totalPosts),
    total_scheduled: formattedScheduledPosts.length,
    total_engagement: formatNumber(summaryPages.reduce((sum, s) => {
        let val = parseFloat(s.engagement) || 0;
        if(s.engagement.includes('K')) val *= 1000;
        return sum + val;
    }, 0)),
    followers_data: followersData,
    posted_data: postedData
  };

  if (connectedAccounts.length === 0 && scheduledPostsRaw.length === 0) {
    return DEMO_OVERVIEW;
  }

  return {
    kpis,
    account_performance: accountPerformance,
    scheduled_posts: formattedScheduledPosts,
    connected_accounts: formattedConnectedAccounts,
    summary_pages: summaryPages,
    engagement_data: engagementData
  };
};

const DEMO_OVERVIEW = {
  kpis: {
    total_followers: "248.5K",
    total_posts: "1.2K",
    total_scheduled: 4,
    total_engagement: "45.2K",
    followers_data: [
      { plt: "Facebook", val: "120.5K" },
      { plt: "Instagram", val: "85.2K" },
      { plt: "Tiktok", val: "32.1K" },
      { plt: "YouTube", val: "10.7K" }
    ],
    posted_data: [
      { plt: "Facebook", val: 450 },
      { plt: "Instagram", val: 380 },
      { plt: "Tiktok", val: 210 },
      { plt: "YouTube", val: 160 }
    ]
  },
  account_performance: [
    {
      name: "Egetinnz PH",
      color: "#22c55e",
      pairs: [
        { plt: "Facebook", val: "45.2K", delta: "+12.4%", up: true },
        { plt: "Instagram", val: "32.8K", delta: "+8.1%", up: true }
      ]
    },
    {
      name: "Egetinnz USA",
      color: "#60a5fa",
      pairs: [
        { plt: "Facebook", val: "28.4K", delta: "+5.2%", up: true },
        { plt: "Tiktok", val: "15.1K", delta: "-2.3%", up: false }
      ]
    },
    {
      name: "Fibei Travel",
      color: "#818cf8",
      pairs: [
        { plt: "Instagram", val: "22.5K", delta: "+18.9%", up: true },
        { plt: "Pinterest", val: "14.2K", delta: "+4.5%", up: true }
      ]
    },
    {
      name: "Digitimmerse",
      color: "#f43f5e",
      pairs: [
        { plt: "YouTube", val: "10.7K", delta: "+9.4%", up: true },
        { plt: "X", val: "8.9K", delta: "+1.2%", up: true }
      ]
    }
  ],
  scheduled_posts: [
    {
      title: "Summer Vacation Promo Reel",
      account: "Fibei Travel",
      aColor: "#818cf8",
      date: "Aug 10, 2026 · 10:00 AM",
      platform: "Instagram"
    },
    {
      title: "Product Launch Announcement Video",
      account: "Digitimmerse",
      aColor: "#f43f5e",
      date: "Aug 12, 2026 · 2:30 PM",
      platform: "YouTube"
    },
    {
      title: "Weekly Tech Tips & Tricks",
      account: "Egetinnz PH",
      aColor: "#22c55e",
      date: "Aug 15, 2026 · 5:00 PM",
      platform: "Facebook"
    },
    {
      title: "Behind the Scenes Story",
      account: "Egetinnz USA",
      aColor: "#60a5fa",
      date: "Aug 18, 2026 · 11:15 AM",
      platform: "Tiktok"
    }
  ],
  connected_accounts: [
    { platform: "Facebook", name: "Facebook", handle: "@egetinnzph" },
    { platform: "Instagram", name: "Instagram", handle: "@fibeitravel" },
    { platform: "Tiktok", name: "Tiktok", handle: "@egetinnzusa" },
    { platform: "YouTube", name: "YouTube", handle: "@digitimmerse" }
  ],
  summary_pages: [
    {
      name: "Egetinnz PH",
      plt: "Facebook",
      engagement: "18.4K",
      third: "145.2K",
      thirdLabel: "Reach",
      posts: "450",
      avgLikes: "38",
      engRate: 8.4
    },
    {
      name: "Fibei Travel",
      plt: "Instagram",
      engagement: "14.2K",
      third: "98.6K",
      thirdLabel: "Reach",
      posts: "380",
      avgLikes: "42",
      engRate: 9.1
    },
    {
      name: "Digitimmerse",
      plt: "YouTube",
      engagement: "8.1K",
      third: "62.4K",
      thirdLabel: "Views",
      posts: "160",
      avgLikes: "55",
      engRate: 7.2
    },
    {
      name: "Egetinnz USA",
      plt: "Tiktok",
      engagement: "4.5K",
      third: "35.1K",
      thirdLabel: "Views",
      posts: "210",
      avgLikes: "21",
      engRate: 6.8
    }
  ],
  engagement_data: [
    {
      plt: "Facebook",
      post: "Weekly Tech Tips & Tricks",
      likes: 340,
      comments: 48,
      shares: 22,
      total: 410
    },
    {
      plt: "Instagram",
      post: "Summer Vacation Promo Reel",
      likes: 520,
      comments: 65,
      shares: 31,
      total: 616
    },
    {
      plt: "YouTube",
      post: "Product Launch Announcement Video",
      likes: 890,
      comments: 112,
      shares: 45,
      total: 1047
    }
  ]
};
