/**
 * EarningsHeatmap — D3.js calendar heatmap of daily guide earnings.
 *
 * Interview talking point:
 *   "I used D3's colour scale and SVG to build a GitHub-style calendar heatmap
 *    showing each guide's daily earnings over the past 12 weeks. This gives
 *    guides an instant visual pattern of busy vs quiet days — something a table
 *    of numbers never achieves. The component is fully responsive via a
 *    ResizeObserver and re-renders on window resize."
 *
 * Props:
 *   data        — array of { date: 'YYYY-MM-DD', earnings: number, trips: number }
 *   weeksToShow — number of weeks to display (default 12)
 *   title       — section heading (default 'Earnings Heatmap')
 */

import React, { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

const CELL   = 14;   // px per day cell
const GAP    = 2;    // px gap between cells
const STEP   = CELL + GAP;
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function EarningsHeatmap({ data = [], weeksToShow = 12, title = 'Earnings Heatmap' }) {
  const svgRef       = useRef(null);
  const tooltipRef   = useRef(null);
  const containerRef = useRef(null);

  const draw = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.getBoundingClientRect().width || 600;
    const weeks   = Math.min(weeksToShow, Math.floor((containerWidth - 40) / STEP));
    const svgW    = weeks * STEP + 40;
    const svgH    = 7 * STEP + 40;

    // Build date → value map
    const byDate = Object.fromEntries((data || []).map(d => [d.date, d]));

    // Generate the last `weeks` weeks of dates
    const today  = new Date();
    today.setHours(0, 0, 0, 0);
    const start  = new Date(today);
    start.setDate(start.getDate() - (weeks * 7 - 1));

    const dates = [];
    const cursor = new Date(start);
    while (cursor <= today) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    const maxEarnings = d3.max(data, d => d.earnings) || 1;

    // Colour scale: light blue → brand yellow → gold
    const colour = d3.scaleSequential()
      .domain([0, maxEarnings])
      .interpolator(d3.interpolateRgbBasis(['#1a2d42', '#34699A', '#FFCC00']));

    // Clear previous render
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width',  svgW)
      .attr('height', svgH)
      .style('overflow', 'visible');

    const g = svg.append('g').attr('transform', 'translate(32,20)');

    // Day-of-week labels (left axis)
    g.selectAll('.day-label')
      .data([0, 1, 2, 3, 4, 5, 6])
      .enter().append('text')
        .attr('class', 'day-label')
        .attr('x', -4)
        .attr('y', d => d * STEP + CELL / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('font-size', 9)
        .attr('fill', '#8ca8c5')
        .text(d => d % 2 === 1 ? DAYS[d] : '');  // show Mon, Wed, Fri only

    // Month labels (top axis) — show on first day of each month
    const monthLabels = new Set();
    dates.forEach((date, i) => {
      const weekIdx = Math.floor(i / 7);
      const dayIdx  = date.getDay();
      if (date.getDate() <= 7 && !monthLabels.has(date.getMonth())) {
        monthLabels.add(date.getMonth());
        g.append('text')
          .attr('x', weekIdx * STEP + CELL / 2)
          .attr('y', -6)
          .attr('font-size', 9)
          .attr('fill', '#8ca8c5')
          .attr('text-anchor', 'middle')
          .text(MONTHS[date.getMonth()]);
      }
    });

    // Day cells
    const tooltip = d3.select(tooltipRef.current);

    g.selectAll('.day')
      .data(dates)
      .enter().append('rect')
        .attr('class', 'day')
        .attr('x',      (_d, i) => Math.floor(i / 7) * STEP)
        .attr('y',      d       => d.getDay() * STEP)
        .attr('width',  CELL)
        .attr('height', CELL)
        .attr('rx',     2)
        .attr('fill',   d => {
          const key  = d3.timeFormat('%Y-%m-%d')(d);
          const val  = byDate[key]?.earnings ?? 0;
          return val > 0 ? colour(val) : '#1a2d42';
        })
        .attr('stroke',       '#0D1B2A')
        .attr('stroke-width', 0.5)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          const key    = d3.timeFormat('%Y-%m-%d')(d);
          const record = byDate[key];
          const earned = record?.earnings ?? 0;
          const trips  = record?.trips    ?? 0;

          d3.select(this).attr('stroke', '#FFCC00').attr('stroke-width', 1.5);

          tooltip
            .style('opacity', 1)
            .style('left', (event.offsetX + 12) + 'px')
            .style('top',  (event.offsetY - 28) + 'px')
            .html(`
              <strong>${d3.timeFormat('%b %d, %Y')(d)}</strong><br/>
              Earnings: <span style="color:#FFCC00">LKR ${earned.toLocaleString()}</span><br/>
              Trips: ${trips}
            `);
        })
        .on('mouseout', function () {
          d3.select(this).attr('stroke', '#0D1B2A').attr('stroke-width', 0.5);
          tooltip.style('opacity', 0);
        });

    // Legend
    const legendW  = 100;
    const legendX  = svgW - legendW - 32;
    const defs     = svg.append('defs');
    const grad     = defs.append('linearGradient').attr('id', 'legend-grad');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#1a2d42');
    grad.append('stop').attr('offset', '50%').attr('stop-color', '#34699A');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#FFCC00');

    const legendG = svg.append('g').attr('transform', `translate(${legendX},${svgH - 14})`);
    legendG.append('rect')
      .attr('width', legendW).attr('height', 8).attr('rx', 2)
      .attr('fill', 'url(#legend-grad)');
    legendG.append('text').attr('x', 0).attr('y', -3).attr('font-size', 8).attr('fill', '#8ca8c5').text('Less');
    legendG.append('text').attr('x', legendW).attr('y', -3).attr('font-size', 8).attr('fill', '#8ca8c5').attr('text-anchor', 'end').text('More');

  }, [data, weeksToShow]);

  useEffect(() => {
    draw();
    const observer = new ResizeObserver(draw);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [draw]);

  const totalEarnings = (data || []).reduce((s, d) => s + (d.earnings || 0), 0);
  const totalTrips    = (data || []).reduce((s, d) => s + (d.trips    || 0), 0);
  const activeDays    = (data || []).filter(d => d.earnings > 0).length;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ color: '#e0eaf5', fontSize: '0.95rem', fontWeight: 700 }}>{title}</h3>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{ fontSize: '0.78rem', color: '#8ca8c5' }}>
            Active days: <strong style={{ color: '#FFCC00' }}>{activeDays}</strong>
          </span>
          <span style={{ fontSize: '0.78rem', color: '#8ca8c5' }}>
            Trips: <strong style={{ color: '#34699A' }}>{totalTrips}</strong>
          </span>
          <span style={{ fontSize: '0.78rem', color: '#8ca8c5' }}>
            Total: <strong style={{ color: '#FFCC00' }}>LKR {totalEarnings.toLocaleString()}</strong>
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg ref={svgRef} />
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position:     'absolute',
          pointerEvents:'none',
          background:   'rgba(13,27,42,0.95)',
          border:       '1px solid rgba(52,105,154,0.4)',
          borderRadius: 6,
          padding:      '6px 10px',
          fontSize:     '0.78rem',
          color:        '#e0eaf5',
          lineHeight:   1.5,
          opacity:      0,
          transition:   'opacity 0.1s',
          zIndex:       100,
          whiteSpace:   'nowrap'
        }}
      />
    </div>
  );
}
