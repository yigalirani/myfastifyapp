/* function  print_comment_form(){
    print("<div class=comment_line></div>");
    if ($g->user){
        $g->id_counter++;
        print "<div><a href='#' onclick='return toggle(\"r$g->id_counter\");'> Add Comment</a></div>";
        print_comment_form2();
    }
    else
        print "<a href='/$g->php_dir/user.php?action=login'>Login to post comments</a><br>";
 }
export function print_comments(){
    print_comment_form();
    $q=get_comment_query();
    $comments=mc_query_all ($q,"comment_id");
     add_children($comments,'comment_parent_id','comment_id');
     foreach($comments as $comment){
         if ($comment['comment_parent_id'])
             break;
         print_comment($comments,$comment,0);
     }
}
     */