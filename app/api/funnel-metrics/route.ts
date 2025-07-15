import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    // Get ALL current lead counts by status (for accurate funnel display)
    const { data: currentLeads, error: currentLeadsError } = await supabase
      .from('leads')
      .select('status, created_at')
      .order('created_at', { ascending: false });

    if (currentLeadsError) {
      console.error('Current leads error:', currentLeadsError);
      return NextResponse.json({ error: currentLeadsError.message }, { status: 500 });
    }

    // Get historical funnel metrics for conversion rates
    const { data: funnelData, error: funnelError } = await supabase
      .rpc('get_funnel_metrics', {
        start_date: startDate,
        end_date: endDate
      });

    if (funnelError) {
      console.error('Funnel metrics error:', funnelError);
      return NextResponse.json({ error: funnelError.message }, { status: 500 });
    }

    // Get conversion flows
    const { data: conversionData, error: conversionError } = await supabase
      .from('lead_conversion_funnel')
      .select('*');

    if (conversionError) {
      console.error('Conversion data error:', conversionError);
      return NextResponse.json({ error: conversionError.message }, { status: 500 });
    }

    // Get time-based progression data
    const { data: progressionData, error: progressionError } = await supabase
      .from('lead_status_history')
      .select(`
        lead_id,
        from_status,
        to_status,
        changed_at,
        duration_in_previous_status
      `)
      .gte('changed_at', startDate)
      .lte('changed_at', endDate)
      .order('changed_at');

    if (progressionError) {
      console.error('Progression data error:', progressionError);
      return NextResponse.json({ error: progressionError.message }, { status: 500 });
    }

    // Calculate conversion rates between stages
    const stageOrder = ['new_customer', 'negotiation', 'won', 'delivered'];
    const conversionRates: Record<string, number> = {};
    
    for (let i = 0; i < stageOrder.length - 1; i++) {
      const currentStage = stageOrder[i];
      const nextStage = stageOrder[i + 1];
      
      const fromCurrent = funnelData.find((row: any) => row.stage === currentStage);
      const toCurrent = conversionData.filter((row: any) => 
        row.from_status === currentStage && row.to_status === nextStage
      );
      
      if (fromCurrent && toCurrent.length > 0) {
        const conversionCount = toCurrent[0].transition_count || 0;
        const totalInStage = fromCurrent.total_entered || 1;
        conversionRates[`${currentStage}_to_${nextStage}`] = Math.round((conversionCount / totalInStage) * 100);
      } else {
        conversionRates[`${currentStage}_to_${nextStage}`] = 0;
      }
    }

    // Create enhanced funnel metrics combining current counts with historical conversion rates
    let enhancedFunnelMetrics;
    
    if (currentLeads && currentLeads.length > 0) {
      // Use current leads data
      const currentCounts = currentLeads.reduce((acc: any, lead: any) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {});

      enhancedFunnelMetrics = ['new_customer', 'negotiation', 'won', 'delivered'].map((stage) => {
        const historicalData = funnelData?.find((row: any) => row.stage === stage);
        return {
          stage,
          total_entered: currentCounts[stage] || 0,
          total_exited: historicalData?.total_exited || 0,
          currently_in_stage: currentCounts[stage] || 0,
          avg_time_in_stage: historicalData?.avg_time_in_stage || null,
          conversion_to_next: historicalData?.conversion_to_next || 0
        };
      });
    } else {
      // Fallback to historical data if current leads query failed
      enhancedFunnelMetrics = funnelData || [];
    }

    // Format response
    const response = {
      dateRange: { startDate, endDate },
      funnelMetrics: enhancedFunnelMetrics,
      conversionFlows: conversionData || [],
      conversionRates,
      timeBasedProgression: progressionData || [],
      summary: {
        totalLeads: currentLeads?.length || 0,
        overallConversionRate: conversionRates['new_customer_to_delivered'] || 0,
        averageTimeToClose: null // Could calculate this from progression data
      }
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 