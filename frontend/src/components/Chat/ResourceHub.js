import React, { useState } from 'react';

const ResourceHub = () => {
  const [activeHubTab, setActiveHubTab] = useState('Files');

  return (
    <aside className="sidebar-right">
      <div className="resource-hub">
        {/* 탭 헤더 */}
        <div className="hub-header">
          <h3 className="hub-title">RESOURCE HUB</h3>
          <div className="hub-tabs">
            {['Files', 'Links', 'Pins', 'Meeting'].map(tab => (
              <button
                key={tab}
                className={"hub-tab" + (activeHubTab === tab ? " active" : "")}
                onClick={() => setActiveHubTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Files 탭 ── */}
        {activeHubTab === 'Files' && (
          <div className="hub-section">
            <p className="hub-section-label">RECENT FILES</p>
            <div className="hub-file-list">
              <div className="hub-file-item">
                <div className="hub-file-icon docx">📝</div>
                <div className="hub-file-info">
                  <span className="hub-file-name">Final_Exam_Prep_v2.docx</span>
                  <span className="hub-file-meta">Uploaded by Aiden</span>
                </div>
              </div>
              <div className="hub-file-item">
                <div className="hub-file-icon pdf">📄</div>
                <div className="hub-file-info">
                  <span className="hub-file-name">Spherical_Coordinates_Diagra...</span>
                  <span className="hub-file-meta">Uploaded 5h ago by Sarah M.</span>
                </div>
              </div>
              <div className="hub-file-item">
                <div className="hub-file-icon pdf">📄</div>
                <div className="hub-file-info">
                  <span className="hub-file-name">Stokes_Theorem_Notes.pdf</span>
                  <span className="hub-file-meta">Uploaded 12:45 AM</span>
                </div>
              </div>
              <div className="hub-file-item">
                <div className="hub-file-icon csv">📊</div>
                <div className="hub-file-info">
                  <span className="hub-file-name">Grade_Distribution_Calc3.csv</span>
                  <span className="hub-file-meta">Uploaded yesterday</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Links 탭 ── */}
        {activeHubTab === 'Links' && (
          <div className="hub-section">
            <p className="hub-section-label">SHARED LINKS</p>
            <div className="hub-file-list">
              <div className="hub-file-item">
                <div className="hub-file-icon" style={{backgroundColor:'#1a2a3a'}}>🔗</div>
                <div className="hub-file-info">
                  <span className="hub-file-name">MIT 6.006 Lecture Notes</span>
                  <span className="hub-file-meta">ocw.mit.edu · Sarah_Labs</span>
                </div>
              </div>
              <div className="hub-file-item">
                <div className="hub-file-icon" style={{backgroundColor:'#1a2a3a'}}>🔗</div>
                <div className="hub-file-info">
                  <span className="hub-file-name">LeetCode Problem Set #34</span>
                  <span className="hub-file-meta">leetcode.com · AlexChen</span>
                </div>
              </div>
              <div className="hub-file-item">
                <div className="hub-file-icon" style={{backgroundColor:'#1a2a3a'}}>🔗</div>
                <div className="hub-file-info">
                  <span className="hub-file-name">Khan Academy - Linear Algebra</span>
                  <span className="hub-file-meta">khanacademy.org · Aiden</span>
                </div>
              </div>
              <div className="hub-file-item">
                <div className="hub-file-icon" style={{backgroundColor:'#1a2a3a'}}>🔗</div>
                <div className="hub-file-info">
                  <span className="hub-file-name">CS50 Week 5 Notes</span>
                  <span className="hub-file-meta">cs50.harvard.edu · Sarah M.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Pins 탭 ── */}
        {activeHubTab === 'Pins' && (
          <div className="hub-section">
            <p className="hub-section-label">PINNED MESSAGES</p>
            <div className="hub-file-list">
              <div className="hub-pin-item">
                <div className="hub-pin-author">
                  <div className="avatar" style={{width:20,minWidth:20,height:20,minHeight:20,fontSize:9}}>A</div>
                  <span>Aiden</span>
                  <span className="hub-pin-time">Yesterday 3:22 PM</span>
                </div>
                <p className="hub-pin-text">Reminder: midterm covers chapters 6–9. Focus on Hebbian theory and backpropagation.</p>
              </div>
              <div className="hub-pin-item">
                <div className="hub-pin-author">
                  <div className="avatar" style={{width:20,minWidth:20,height:20,minHeight:20,fontSize:9}}>S</div>
                  <span>Sarah M.</span>
                  <span className="hub-pin-time">Mon 11:05 AM</span>
                </div>
                <p className="hub-pin-text">Study session every Tuesday 8PM — join the lounge 10 mins early to set up!</p>
              </div>
              <div className="hub-pin-item">
                <div className="hub-pin-author">
                  <div className="avatar" style={{width:20,minWidth:20,height:20,minHeight:20,fontSize:9,backgroundColor:'#14532d',color:'#00ff66'}}>AI</div>
                  <span style={{color:'#00ff66'}}>SAGE AI</span>
                  <span className="hub-pin-time">Sun 9:00 AM</span>
                </div>
                <p className="hub-pin-text">Weekly summary posted in shared-resources. Key topics: sorting algorithms, graph traversal, dynamic programming.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Meeting 탭 ── */}
        {activeHubTab === 'Meeting' && (
          <div className="hub-section">
            <p className="hub-section-label">UPCOMING MEETINGS</p>
            <div className="hub-meeting">
              <div className="hub-meeting-label"><span className="meeting-dot">●</span> LIVE NOW</div>
              <p className="hub-meeting-title">Weekly Review Session</p>
              <p className="hub-meeting-sub">Started 5 minutes ago · 6 students joined</p>
              <button className="hub-meeting-btn">Join Lounge</button>
            </div>
            <div className="hub-meeting" style={{background:'linear-gradient(135deg,#1a1a2e,#16213e)', borderColor:'rgba(100,100,255,0.2)', marginTop: 10}}>
              <div className="hub-meeting-label" style={{color:'#818cf8'}}>📅 SCHEDULED</div>
              <p className="hub-meeting-title">Algorithm Deep Dive</p>
              <p className="hub-meeting-sub" style={{color:'#a5b4fc'}}>Tomorrow 7:00 PM · 3 students RSVP'd</p>
              <button className="hub-meeting-btn" style={{backgroundColor:'#818cf8', color:'#fff'}}>RSVP</button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ResourceHub;
