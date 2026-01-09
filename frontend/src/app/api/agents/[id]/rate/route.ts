import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const { jobId, userAddress, rating } = await req.json();
    
    console.log("[RATING API] Received rating request:", { agentId, jobId, userAddress, rating });

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (!jobId || !userAddress) {
      return NextResponse.json(
        { error: "jobId and userAddress are required" },
        { status: 400 }
      );
    }

    // Get agent to verify it exists
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, average_rating, rating_count")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      console.log("[RATING API] Agent not found:", agentId);
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    
    console.log("[RATING API] Found agent:", { id: agent.id, currentRating: agent.average_rating, currentCount: agent.rating_count });

    // Insert rating (upsert to handle duplicate submissions)
    const { error: ratingError } = await supabase
      .from("agent_ratings")
      .upsert(
        {
          agent_id: agentId,
          job_id: jobId,
          user_address: userAddress.toLowerCase(),
          rating,
        },
        { onConflict: "job_id,user_address" }
      );

    if (ratingError) {
      console.error("Rating insert error:", ratingError);
      return NextResponse.json(
        { error: "Failed to save rating" },
        { status: 500 }
      );
    }

    // Calculate new average rating
    const { data: allRatings } = await supabase
      .from("agent_ratings")
      .select("rating")
      .eq("agent_id", agentId);

    if (allRatings && allRatings.length > 0) {
      const totalRatings = allRatings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRatings / allRatings.length;
      
      console.log("[RATING API] Calculating new average:", { totalRatings, count: allRatings.length, newAverage: averageRating.toFixed(2) });

      // Update agent's average rating and count
      const { error: updateError } = await supabase
        .from("agents")
        .update({
          average_rating: parseFloat(averageRating.toFixed(2)),
          rating_count: allRatings.length,
        })
        .eq("id", agentId);
        
      if (updateError) {
        console.error("[RATING API] Failed to update agent stats:", updateError);
      } else {
        console.log("[RATING API] Successfully updated agent rating to", averageRating.toFixed(2));
      }
    }

    return NextResponse.json({
      success: true,
      message: "Rating submitted successfully",
    });
  } catch (error) {
    console.error("Rating API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;

    // Get agent rating stats
    const { data: agent, error } = await supabase
      .from("agents")
      .select("average_rating, rating_count, total_jobs_served")
      .eq("id", agentId)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      averageRating: agent.average_rating,
      ratingCount: agent.rating_count,
      totalJobsServed: agent.total_jobs_served,
    });
  } catch (error) {
    console.error("Rating GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
