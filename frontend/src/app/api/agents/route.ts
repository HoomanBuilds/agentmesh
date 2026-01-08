import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { CreateAgentInput } from "@/types";

// GET /api/agents - List all agents with optional search
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const owner = searchParams.get("owner");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("agents")
      .select("*", { count: "exact" })
      .eq("active", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by owner if provided
    if (owner) {
      query = query.eq("owner_address", owner.toLowerCase());
    }

    // Search in name and description
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        data,
        total: count || 0,
        limit,
        offset,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const body: CreateAgentInput = await request.json();

    // Validate required fields
    if (!body.name || !body.system_prompt || !body.price_per_call || !body.owner_address) {
      return NextResponse.json(
        { error: "Missing required fields: name, system_prompt, price_per_call, owner_address" },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from("agents")
      .insert({
        name: body.name,
        description: body.description || null,
        system_prompt: body.system_prompt,
        price_per_call: body.price_per_call,
        input_schema: body.input_schema || {},
        output_schema: body.output_schema || {},
        owner_address: body.owner_address.toLowerCase(),
        active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
