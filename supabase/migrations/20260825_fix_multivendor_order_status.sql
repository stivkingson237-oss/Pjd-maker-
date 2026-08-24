-- PJD Maker: align multivendor order creation with the orders status constraint.
CREATE OR REPLACE FUNCTION public.create_multivendor_order(p_user_id uuid, p_items jsonb, p_payment_method text DEFAULT 'pending'::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
declare
  v_order_id uuid; v_total numeric:=0; r jsonb; v_product record; v_qty integer; v_line numeric; v_commission numeric;
begin
  if auth.uid() is null or auth.uid()<>p_user_id then raise exception 'Non autorise'; end if;
  if p_items is null or jsonb_array_length(p_items)=0 then raise exception 'Panier vide'; end if;
  insert into public.orders(user_id,total,status,payment_method)
  values(p_user_id,0,'en_attente',coalesce(nullif(p_payment_method,''),'pending')) returning id into v_order_id;
  for r in select * from jsonb_array_elements(p_items) loop
    v_qty:=greatest(1,coalesce((r->>'quantity')::integer,1));
    select dp.id,dp.title,dp.price,dp.seller_id,dp.shop_id,coalesce(s.commission_rate,0) commission_rate into v_product
    from public.digital_products dp left join public.shops s on s.id=dp.shop_id
    where dp.id=(r->>'product_id')::uuid and dp.status in ('approved','approuvé','actif','active') for update;
    if not found then raise exception 'Produit indisponible: %',r->>'product_id'; end if;
    v_line:=v_product.price*v_qty; v_commission:=round(v_line*v_product.commission_rate/100,2);
    insert into public.order_items(order_id,product_id,seller_id,name,price,quantity,shop_id,commission,seller_net,unit_price,line_total,commission_rate)
    values(v_order_id,v_product.id,v_product.seller_id,v_product.title,v_product.price,v_qty,v_product.shop_id,v_commission,v_line-v_commission,v_product.price,v_line,v_product.commission_rate);
    v_total:=v_total+v_line;
  end loop;
  update public.orders set total=v_total,
    platform_fee=(select coalesce(sum(commission),0) from public.order_items where order_id=v_order_id),
    seller_total=(select coalesce(sum(seller_net),0) from public.order_items where order_id=v_order_id) where id=v_order_id;
  return v_order_id;
end; $function$;
