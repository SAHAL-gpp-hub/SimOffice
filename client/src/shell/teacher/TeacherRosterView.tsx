import { useState, useMemo } from 'react';
import type { DashboardTeam } from './types';
import { IconSearch, IconLightbulb } from './icons';

interface Props {
  teams: DashboardTeam[];
  onSendHint: (teamId: string) => void;
}

export function TeacherRosterView({ teams, onSendHint }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'seated'>('all');

  // Flatten all students across all teams
  const allStudents = useMemo(() => {
    const list: Array<{
      rosterEntryId: string;
      displayName: string;
      connected: boolean;
      seated: boolean;
      deskId?: string;
      departmentCode: string;
      teamId: string;
    }> = [];

    teams.forEach((team) => {
      team.roster?.forEach((student) => {
        list.push({
          ...student,
          departmentCode: team.departmentCode || team.teamId,
          teamId: team.teamId,
        });
      });
    });

    return list;
  }, [teams]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter((student) => {
      if (statusFilter === 'online' && !student.connected) return false;
      if (statusFilter === 'seated' && !student.seated) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          student.displayName.toLowerCase().includes(q) ||
          student.departmentCode.toLowerCase().includes(q) ||
          (student.deskId && student.deskId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allStudents, statusFilter, searchTerm]);

  return (
    <div className="tc-roster-view" role="region" aria-label="Class Roster Directory">
      <div className="tc-stage-toolbar">
        <div className="tc-filter-pillbox">
          <button
            type="button"
            className={`tc-filter-pill ${statusFilter === 'all' ? 'tc-filter-pill--active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Enrolled ({allStudents.length})
          </button>
          <button
            type="button"
            className={`tc-filter-pill ${statusFilter === 'online' ? 'tc-filter-pill--active' : ''}`}
            onClick={() => setStatusFilter('online')}
          >
            Online in Lab ({allStudents.filter((s) => s.connected).length})
          </button>
          <button
            type="button"
            className={`tc-filter-pill ${statusFilter === 'seated' ? 'tc-filter-pill--active' : ''}`}
            onClick={() => setStatusFilter('seated')}
          >
            Seated at Desks ({allStudents.filter((s) => s.seated).length})
          </button>
        </div>

        <div className="tc-search-wrap">
          <span className="tc-search-icon-svg" aria-hidden="true">
            <IconSearch size={14} />
          </span>
          <input
            type="search"
            className="tc-search-input-field"
            placeholder="Search student, desk, or department…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="tc-roster-table-container">
        <table className="tc-table">
          <thead>
            <tr>
              <th>Call-Sign / Student</th>
              <th>Status</th>
              <th>Department Sector</th>
              <th>Assigned Desk</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const initials = student.displayName
                  ? student.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'ST';

                return (
                  <tr key={student.rosterEntryId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: student.connected ? 'var(--tc-cyan-tint)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${student.connected ? 'var(--tc-cyan)' : 'rgba(255, 255, 255, 0.1)'}`,
                            color: student.connected ? 'var(--tc-cyan)' : 'var(--tc-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontFamily: 'var(--tc-font-mono)',
                            fontSize: '11px',
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <span style={{ color: '#fff', fontWeight: 700 }}>{student.displayName}</span>
                          <span style={{ display: 'block', fontSize: '11px', color: 'var(--tc-text-muted)', fontFamily: 'var(--tc-font-mono)' }}>
                            ID: {student.rosterEntryId.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="tc-status-badge"
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          color: student.connected
                            ? student.seated
                              ? 'var(--tc-mint)'
                              : 'var(--tc-cyan)'
                            : '#64748b',
                          background: student.connected
                            ? student.seated
                              ? 'var(--tc-mint-tint)'
                              : 'var(--tc-cyan-tint)'
                            : 'rgba(255, 255, 255, 0.04)',
                          border: `1px solid ${
                            student.connected
                              ? student.seated
                                ? 'var(--tc-mint-border)'
                                : 'var(--tc-cyan-border)'
                              : 'rgba(255, 255, 255, 0.08)'
                          }`,
                        }}
                      >
                        <span
                          className="tc-pulse-beacon"
                          style={{
                            background: student.connected ? (student.seated ? 'var(--tc-mint)' : 'var(--tc-cyan)') : '#64748b',
                            boxShadow: student.connected ? (student.seated ? 'var(--tc-mint-glow)' : 'var(--tc-cyan-glow)') : 'none',
                          }}
                        />
                        <span>{student.connected ? (student.seated ? 'SEATED' : 'ONLINE ROAMING') : 'OFFLINE'}</span>
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--tc-cyan)', textTransform: 'uppercase', fontFamily: 'var(--tc-font-mono)' }}>
                        {student.departmentCode}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--tc-font-mono)', fontSize: '12px', color: '#fff' }}>
                        {student.seated ? student.deskId || 'Desk 01' : 'Standby / Lab Floor'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="tc-btn tc-btn--hint"
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        onClick={() => onSendHint(student.teamId)}
                        title={`Send tactical clue to ${student.displayName}`}
                      >
                        <IconLightbulb size={11} />
                        <span>Dispatch Clue</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--tc-text-muted)' }}>
                  No students found matching current search filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
