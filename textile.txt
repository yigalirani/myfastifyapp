
<strong>Unique attributes columns.</strong><br>
Some XML texts have subtags with unique attribute names - the attribute name appear only in one of the subtags. 
XML Marker must create a separate column for each of these attributes. Each column has only one non-blank cell.<br><br>
This may lead to creating of too many attribute columns, which may leads to a confusing display. The following screenshot shows such a case:<br><br>


<img src="unique.gif" width="539" height="464" border="0" alt=""><br>
<i>Screenshot: too many columns.</i><br><br>
Judging by the above example, this is not such a big problem, but some XML files can produce hundreds of these single-occupancy columns.<br><Br>

<strong>The solution - the unique attributes column.</strong><br>
To solve this problem, XML Marker consolidates such columns by replacing them with a special column titled "Unique Attributes".<br><br>
This column cells contain the unique attributes of the corresponding subtags. If a subtag has exactly one unique attribute, then it's cell reads: attribute_name="attribute_value". If there is more then one, then the text is the number of unique attributes. The following screenshot is the same as the above, with this feature on:<br><br>
<img src="unique2.gif" width="539" height="464" border="0" alt=""><br>
<i>Screenshot: the "unique attributes" feature reduces the number of columns</i><br><br>
<strong>Unique subtags </strong><br>
Unique subtags works the same as unique attributes, except that the name of the columns is "Unique subtags". If the subtag has more then one occurrence then the corresponding cell will show the number of occurrences. If there is more then one unique subtag, then the corresponding cell will show the number of unique subtags, and the total number of occurrences, if different.<br><br><Br>
<strong>Turning on the unique consolidation feature</strong><br>
To turn on this feature, go to the options menu and select "unique consolidation". This will show a dialog that will let you allow this feature if it saves more then a set number of columns. Note that this number works separately for unique attributes and unique subtags. The default value is 2.

